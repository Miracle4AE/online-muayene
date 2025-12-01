import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateDoctorSchema = z.object({
  name: z.string().min(1, "İsim gereklidir").optional(),
  email: z.string().email("Geçerli bir email adresi giriniz").optional(),
  phone: z.string().optional(),
  specialization: z.string().min(1, "Uzmanlık alanı gereklidir").optional(),
  licenseNumber: z.string().min(1, "Lisans numarası gereklidir").optional(),
  tcKimlikNo: z.string().length(11, "T.C. Kimlik No 11 haneli olmalıdır").optional().nullable(),
  university: z.string().optional().nullable(),
  graduationYear: z.number().int().min(1950).max(new Date().getFullYear()).optional().nullable(),
  workStatus: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  experience: z.number().int().min(0).optional().nullable(),
  bio: z.string().optional().nullable(),
  appointmentPrice: z.number().min(0).optional().nullable(),
});

function getAdminInfo(request: NextRequest): { email: string; hospital: string } | null {
  const adminToken = request.cookies.get("admin_token");
  if (!adminToken) return null;
  
  try {
    const decoded = Buffer.from(adminToken.value, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const email = parts[0];
    const hospital = parts[1] || "";
    
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(email)) return null;
    
    let finalHospital = hospital;
    if (!finalHospital) {
      const adminHospitals = process.env.ADMIN_HOSPITALS?.split(",") || [];
      const emailIndex = adminEmails.indexOf(email);
      finalHospital = adminHospitals[emailIndex] || adminHospitals[0];
    }
    
    return { email, hospital: finalHospital };
  } catch {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminInfo = getAdminInfo(request);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const doctorId = params.id;
    const body = await request.json();
    const validatedData = updateDoctorSchema.parse(body);

    // Doktorun admin'in hastanesinde olup olmadığını kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || doctor.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    if (!doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Sadece admin'in hastanesindeki doktorları güncelleyebilir
    if (doctor.doctorProfile.hospital !== adminInfo.hospital) {
      return NextResponse.json(
        { error: "Bu doktoru güncelleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Email kontrolü (eğer değiştiriliyorsa)
    if (validatedData.email && validatedData.email !== doctor.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Bu email adresi zaten kullanılıyor" },
          { status: 400 }
        );
      }
    }

    // T.C. Kimlik No kontrolü (eğer değiştiriliyorsa)
    if (validatedData.tcKimlikNo && validatedData.tcKimlikNo !== doctor.doctorProfile.tcKimlikNo) {
      const existingTcKimlik = await prisma.doctorProfile.findUnique({
        where: { tcKimlikNo: validatedData.tcKimlikNo },
      });

      if (existingTcKimlik) {
        return NextResponse.json(
          { error: "Bu T.C. Kimlik No zaten kullanılıyor" },
          { status: 400 }
        );
      }
    }

    // Lisans numarası kontrolü (eğer değiştiriliyorsa)
    if (validatedData.licenseNumber && validatedData.licenseNumber !== doctor.doctorProfile.licenseNumber) {
      const existingLicense = await prisma.doctorProfile.findUnique({
        where: { licenseNumber: validatedData.licenseNumber },
      });

      if (existingLicense) {
        return NextResponse.json(
          { error: "Bu lisans numarası zaten kullanılıyor" },
          { status: 400 }
        );
      }
    }

    // User tablosunu güncelle
    const userUpdateData: any = {};
    if (validatedData.name !== undefined) userUpdateData.name = validatedData.name;
    if (validatedData.email !== undefined) userUpdateData.email = validatedData.email;
    if (validatedData.phone !== undefined) userUpdateData.phone = validatedData.phone || null;

    // DoctorProfile tablosunu güncelle
    const profileUpdateData: any = {};
    if (validatedData.specialization !== undefined) profileUpdateData.specialization = validatedData.specialization;
    if (validatedData.licenseNumber !== undefined) profileUpdateData.licenseNumber = validatedData.licenseNumber;
    if (validatedData.tcKimlikNo !== undefined) profileUpdateData.tcKimlikNo = validatedData.tcKimlikNo || null;
    if (validatedData.university !== undefined) profileUpdateData.university = validatedData.university || null;
    if (validatedData.graduationYear !== undefined) profileUpdateData.graduationYear = validatedData.graduationYear || null;
    if (validatedData.workStatus !== undefined) profileUpdateData.workStatus = validatedData.workStatus || null;
    if (validatedData.city !== undefined) profileUpdateData.city = validatedData.city || null;
    if (validatedData.experience !== undefined) profileUpdateData.experience = validatedData.experience || null;
    if (validatedData.bio !== undefined) profileUpdateData.bio = validatedData.bio || null;
    if (validatedData.appointmentPrice !== undefined) {
      profileUpdateData.appointmentPrice = validatedData.appointmentPrice !== null ? validatedData.appointmentPrice : null;
    }

    // Güncellemeleri yap
    // Önce User tablosunu güncelle
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: doctorId },
        data: userUpdateData,
      });
    }

    // Sonra DoctorProfile tablosunu güncelle
    if (Object.keys(profileUpdateData).length > 0) {
      // Eğer appointmentPrice varsa, raw SQL kullan (Prisma client güncel olmayabilir)
      if (profileUpdateData.appointmentPrice !== undefined) {
        await prisma.$executeRaw`
          UPDATE doctor_profiles 
          SET appointmentPrice = ${profileUpdateData.appointmentPrice},
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = ${doctor.doctorProfile.id}
        `;
        // appointmentPrice'ı profileUpdateData'dan çıkar, diğer alanlar normal güncelleme ile yapılacak
        delete profileUpdateData.appointmentPrice;
      }
      
      // Diğer alanları normal şekilde güncelle
      if (Object.keys(profileUpdateData).length > 0) {
        await prisma.doctorProfile.update({
          where: { id: doctor.doctorProfile.id },
          data: profileUpdateData,
        });
      }
    }

    // Güncellenmiş doktoru getir
    const updatedUser = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    const { password, ...doctorData } = updatedUser;

    return NextResponse.json({
      message: "Doktor başarıyla güncellendi",
      doctor: doctorData,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating doctor:", error);
    return NextResponse.json(
      { error: error.message || "Doktor güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

