import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Email doğrulama token'ı oluştur
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.register);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email gereklidir" },
        { status: 400 }
      );
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctorProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Eski token'ları sil
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
      },
    });

    // Yeni token oluştur
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 saat geçerli

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: "EMAIL_VERIFICATION",
        expiresAt,
      },
    });

    // Email gönder
    const verificationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`;
    
    const { sendEmail, emailTemplates } = await import("@/lib/email");
    await sendEmail(
      email,
      "Email Doğrulama - Online Muayene",
      emailTemplates.verifyEmail({ name: user.name, verificationUrl })
    );

    return NextResponse.json({
      message: "Doğrulama email'i gönderildi",
      // Development için token'ı döndürüyoruz (production'da kaldırılmalı)
      ...(process.env.NODE_ENV === "development" && { token, verificationUrl }),
    });
  } catch (error) {
    console.error("Error creating verification token:", error);
    return NextResponse.json(
      { error: "Doğrulama token'ı oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Email doğrulama token'ını doğrula
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token gereklidir" },
        { status: 400 }
      );
    }

    // Token'ı bul
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Geçersiz token" },
        { status: 400 }
      );
    }

    // Token süresi dolmuş mu kontrol et
    if (verificationToken.expiresAt < new Date()) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      return NextResponse.json(
        { error: "Token süresi dolmuş" },
        { status: 400 }
      );
    }

    // Email doğrulandı olarak işaretle
    const user = await prisma.user.findUnique({
      where: { id: verificationToken.userId },
      include: {
        doctorProfile: true,
      },
    });

    if (user?.doctorProfile) {
      await prisma.doctorProfile.update({
        where: { userId: user.id },
        data: {
          emailVerified: true,
        },
      });
    }

    // Token'ı sil
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    return NextResponse.json({
      message: "Email başarıyla doğrulandı",
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return NextResponse.json(
      { error: "Email doğrulanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

