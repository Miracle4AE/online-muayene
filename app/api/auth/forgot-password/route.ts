import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import crypto from "crypto";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Rate limiting kontrolü
  const limit = rateLimit(request, RATE_LIMITS.forgotPassword);
  
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Çok fazla deneme yaptınız. Lütfen ${Math.ceil((limit.resetTime - Date.now()) / 60000)} dakika sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email adresi gerekli" },
        { status: 400 }
      );
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Güvenlik için: Email bulunsun bulunmasın başarılı mesajı göster
    // (böylece saldırganlar hangi email'lerin kayıtlı olduğunu öğrenemez)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Eğer bu email adresi kayıtlıysa, şifre sıfırlama linki gönderildi",
      });
    }

    // Reset token oluştur (rastgele 32 karakter)
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Token'ı hash'le (database'de güvenli saklamak için)
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token'ı ve son kullanma tarihini kaydet (1 saat geçerli)
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 saat

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: resetTokenExpires,
      },
    });

    // Şifre sıfırlama linki
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    // Email gönder
    const emailSubject = "Şifre Sıfırlama - Online Muayene";
    const emailHtml = emailTemplates.resetPassword({
      name: user.name,
      resetUrl,
    });

    await sendEmail(user.email, emailSubject, emailHtml);

    return NextResponse.json({
      success: true,
      message: "Şifre sıfırlama linki email adresinize gönderildi",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}

