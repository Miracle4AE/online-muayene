import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientProfileUpdateSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { decryptTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        patientProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    const { password, ...userData } = user;

    const decryptedProfile = user.patientProfile
      ? {
          ...user.patientProfile,
          tcKimlikNo: user.patientProfile.tcKimlikNo
            ? decryptTcKimlik(user.patientProfile.tcKimlikNo)
            : null,
        }
      : null;

    return NextResponse.json({
      user: userData,
      profile: decryptedProfile,
    });
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    return NextResponse.json(
      { error: "Profil bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  let updateData: {
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    emergencyPhone?: string | null;
    bloodType?: string | null;
    allergies?: string | null;
    chronicDiseases?: string | null;
    medications?: string | null;
    shareDataWithSameHospital?: boolean;
    shareDataWithOtherHospitals?: boolean;
  } = {};

  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = patientProfileUpdateSchema.parse(body);
    } catch (validationError: unknown) {
      if (validationError instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Geçersiz veri formatı",
            details: validationError.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Boş string'leri null'a çevir ve sadece tanımlı alanları ekle
    updateData = {};

    if (validatedData.phone !== undefined) {
      updateData.phone = validatedData.phone === "" ? null : validatedData.phone;
    }

    if (validatedData.dateOfBirth !== undefined) {
      updateData.dateOfBirth = validatedData.dateOfBirth 
        ? new Date(validatedData.dateOfBirth)
        : null;
    }

    if (validatedData.gender !== undefined) {
      updateData.gender = validatedData.gender === "" ? null : validatedData.gender;
    }

    if (validatedData.address !== undefined) {
      updateData.address = validatedData.address === "" ? null : validatedData.address;
    }

    if (validatedData.emergencyContact !== undefined) {
      updateData.emergencyContact = validatedData.emergencyContact === "" ? null : validatedData.emergencyContact;
    }

    if (validatedData.emergencyPhone !== undefined) {
      updateData.emergencyPhone = validatedData.emergencyPhone === "" ? null : validatedData.emergencyPhone;
    }

    if (validatedData.bloodType !== undefined) {
      updateData.bloodType = validatedData.bloodType === "" ? null : validatedData.bloodType;
    }

    if (validatedData.allergies !== undefined) {
      updateData.allergies = validatedData.allergies === "" ? null : validatedData.allergies;
    }

    if (validatedData.chronicDiseases !== undefined) {
      updateData.chronicDiseases = validatedData.chronicDiseases === "" ? null : validatedData.chronicDiseases;
    }

    if (validatedData.medications !== undefined) {
      updateData.medications = validatedData.medications === "" ? null : validatedData.medications;
    }

    if (validatedData.shareDataWithSameHospital !== undefined) {
      updateData.shareDataWithSameHospital = validatedData.shareDataWithSameHospital;
    }

    if (validatedData.shareDataWithOtherHospitals !== undefined) {
      updateData.shareDataWithOtherHospitals = validatedData.shareDataWithOtherHospitals;
    }

    // Undefined değerleri temizle
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // Eğer güncellenecek bir şey yoksa hata döndür
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek veri bulunamadı" },
        { status: 400 }
      );
    }

    // Hasta profilinin var olduğunu kontrol et
    const existingProfile = await prisma.patientProfile.findUnique({
      where: { userId: auth.userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    // User tablosunu güncelle (phone)
    if (updateData.phone !== undefined) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { phone: updateData.phone },
      });
      delete updateData.phone;
    }

    // PatientProfile'i güncelle
    const updatedProfile = await prisma.patientProfile.update({
      where: { userId: auth.userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Profil başarıyla güncellendi",
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Hasta profili bulunamadı" },
          { status: 404 }
        );
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Bu bilgi zaten kullanılıyor" },
          { status: 409 }
        );
      }
    }

    console.error("Error updating patient profile:", error);
    if (error && typeof error === "object" && "message" in error) {
      console.error("Error message:", error.message);
    }
    if (error && typeof error === "object" && "stack" in error) {
      console.error("Error stack:", error.stack);
    }
    if (process.env.NODE_ENV === "development") {
      console.error("Update data:", updateData);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
    }

    return NextResponse.json(
      { error: "Profil güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

