import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { doctorRegisterSchema } from "@/lib/validations";
import { ZodError } from "zod";
import crypto from "crypto";
import { encryptTcKimlik, hashTcKimlik } from "@/lib/encryption";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.register);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = doctorRegisterSchema.parse(body);

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

    // T.C. Kimlik No kontrolü
    const tcHash = hashTcKimlik(validatedData.tcKimlikNo);
    if (!tcHash) {
      return NextResponse.json(
        { error: "Geçersiz T.C. Kimlik Numarası" },
        { status: 400 }
      );
    }

    const existingTcKimlik = await prisma.doctorProfile.findUnique({
      where: { tcKimlikNoHash: tcHash },
    });

    if (existingTcKimlik) {
      return NextResponse.json(
        { error: "Bu T.C. Kimlik Numarası zaten kayıtlı" },
        { status: 400 }
      );
    }

    // Lisans numarası kontrolü
    const existingLicense = await prisma.doctorProfile.findUnique({
      where: { licenseNumber: validatedData.licenseNumber },
    });

    if (existingLicense) {
      return NextResponse.json(
        { error: "Bu lisans numarası zaten kayıtlı" },
        { status: 400 }
      );
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Kullanıcı ve doktor profilini oluştur
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        role: "DOCTOR",
        doctorProfile: {
          create: {
            specialization: validatedData.specialization,
            licenseNumber: validatedData.licenseNumber,
            tcKimlikNo: encryptTcKimlik(validatedData.tcKimlikNo), // Şifrelenmiş TC No
            tcKimlikNoHash: tcHash,
            bio: validatedData.bio,
            experience: validatedData.experience,
            hospital: validatedData.hospital,
            university: validatedData.university,
            graduationYear: validatedData.graduationYear,
            workStatus: validatedData.workStatus,
            city: validatedData.city,
            verificationStatus: "PENDING", // Onay bekliyor
            emailVerified: false,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    // Email doğrulama token'ı oluştur
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 saat geçerli

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      },
    });

    // Email doğrulama linki (şimdilik console.log - ileride nodemailer eklenebilir)
    const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;
    console.log(`Email verification link for ${user.email}: ${verificationUrl}`);

    // TODO: Gerçek email gönderme servisi entegre edilecek
    // await sendVerificationEmail(user.email, verificationUrl);

    return NextResponse.json(
      {
        message: "Doktor kaydı başarıyla oluşturuldu. Belgeleriniz incelendikten sonra hesabınız onaylanacaktır.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        doctorProfile: {
          id: user.doctorProfile?.id,
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

