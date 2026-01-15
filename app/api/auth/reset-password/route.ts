import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.forgotPassword);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token ve şifre gerekli" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır" },
        { status: 400 }
      );
    }

    // Token'ı hash'le (database'de hash'lenmiş halde saklanıyor)
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Token'ı database'de bul ve süresinin geçmediğini kontrol et
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(), // Şu andan büyük olmalı (henüz geçmemiş)
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Geçersiz veya süresi dolmuş token" },
        { status: 400 }
      );
    }

    // Yeni şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);

    // Şifreyi güncelle ve reset token'larını temizle
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Şifreniz başarıyla değiştirildi",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

