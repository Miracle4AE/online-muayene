import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Build sırasında statik olarak analiz edilmesini engelle
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createDoctorSchema = z.object({
  name: z.string().min(1, "İsim gereklidir"),
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  phone: z.string().optional(),
  specialization: z.string().min(1, "Uzmanlık alanı gereklidir"),
  licenseNumber: z.string().min(1, "Lisans numarası gereklidir"),
  tcKimlikNo: z.string().length(11, "T.C. Kimlik No 11 haneli olmalıdır").optional(),
  hospital: z.string().optional(),
  university: z.string().optional(),
  graduationYear: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  workStatus: z.string().optional(),
  city: z.string().optional(),
  experience: z.number().int().min(0).optional(),
  bio: z.string().optional(),
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

export async function POST(request: NextRequest) {
  try {
    const adminInfo = getAdminInfo(request);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createDoctorSchema.parse(body);

    // Email kontrolü - zaten kayıtlı mı?
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanılıyor" },
        { status: 400 }
      );
    }

    // T.C. Kimlik No kontrolü (varsa)
    if (validatedData.tcKimlikNo) {
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

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Kullanıcıyı oluştur
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone || null,
        role: "DOCTOR",
        doctorProfile: {
          create: {
            specialization: validatedData.specialization,
            licenseNumber: validatedData.licenseNumber,
            tcKimlikNo: validatedData.tcKimlikNo || null,
            hospital: validatedData.hospital || adminInfo.hospital, // Admin'in hastanesi
            university: validatedData.university || null,
            graduationYear: validatedData.graduationYear || null,
            workStatus: validatedData.workStatus || null,
            city: validatedData.city || null,
            experience: validatedData.experience || null,
            bio: validatedData.bio || null,
            verificationStatus: "APPROVED", // Otomatik onaylı
            emailVerified: true, // Email doğrulanmış sayılır
            verifiedAt: new Date(),
            verifiedBy: adminInfo.email,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    return NextResponse.json({
      message: "Doktor başarıyla oluşturuldu",
      doctor: {
        id: user.id,
        name: user.name,
        email: user.email,
        doctorProfile: user.doctorProfile,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating doctor:", error);
    return NextResponse.json(
      { error: error.message || "Doktor oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

