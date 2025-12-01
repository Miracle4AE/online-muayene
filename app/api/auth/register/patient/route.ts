import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { patientRegisterSchema } from "@/lib/validations";
import { ZodError } from "zod";
import { encryptTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = patientRegisterSchema.parse(body);

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanılıyor" },
        { status: 400 }
      );
    }

    // T.C. Kimlik No kontrolü (şifrelenmiş halde arama yapamayız, tüm kayıtları kontrol etmeliyiz)
    // Not: Bu performans sorunu yaratabilir, alternatif: TC No'nun hash'ini ayrı bir kolonda sakla
    const allPatients = await prisma.patientProfile.findMany({
      select: { tcKimlikNo: true },
    });
    
    // Şifre çözümü yaparak kontrol et (geçici çözüm)
    // Production'da TC No hash'ini ayrı kolonda saklamalısın
    const { decryptTcKimlik } = await import("@/lib/encryption");
    const tcExists = allPatients.some(p => {
      try {
        return decryptTcKimlik(p.tcKimlikNo || "") === validatedData.tcKimlikNo;
      } catch {
        return p.tcKimlikNo === validatedData.tcKimlikNo;
      }
    });

    if (tcExists) {
      return NextResponse.json(
        { error: "Bu T.C. Kimlik Numarası zaten kayıtlı" },
        { status: 400 }
      );
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Tarih formatını düzelt
    let dateOfBirth = null;
    if (validatedData.dateOfBirth) {
      dateOfBirth = new Date(validatedData.dateOfBirth);
    }

    // Kullanıcı ve hasta profilini oluştur
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        role: "PATIENT",
        patientProfile: {
          create: {
            tcKimlikNo: encryptTcKimlik(validatedData.tcKimlikNo), // Şifrelenmiş TC No
            dateOfBirth: dateOfBirth,
            gender: validatedData.gender,
            address: validatedData.address,
            emergencyContact: validatedData.emergencyContact,
            emergencyPhone: validatedData.emergencyPhone,
            allergies: validatedData.allergies,
            chronicDiseases: validatedData.chronicDiseases,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    return NextResponse.json(
      {
        message: "Hasta kaydı başarıyla oluşturuldu",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Kayıt işlemi sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}

