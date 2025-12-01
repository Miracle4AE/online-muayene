import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

// 2FA kodu oluştur (6 haneli)
export function generate2FACode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// 2FA kodu gönder (email veya SMS)
export async function send2FACode(
  userId: string,
  method: "EMAIL" | "SMS"
): Promise<{ success: boolean; error?: string }> {
  try {
    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Kullanıcı bulunamadı" };
    }

    // Kod oluştur
    const code = generate2FACode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika geçerli

    // Eski kodları sil
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: "TWO_FACTOR",
      },
    });

    // Yeni kodu kaydet
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: code,
        type: "TWO_FACTOR",
        expiresAt,
      },
    });

    // Kodu gönder
    if (method === "EMAIL") {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🔐 Güvenlik Kodu</h1>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 30px; border-radius: 10px; text-align: center;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              Merhaba ${user.name},
            </p>
            <p style="color: #4b5563; margin-bottom: 25px;">
              Giriş yapabilmek için aşağıdaki doğrulama kodunu kullanın:
            </p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #2563eb; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 8px; margin: 0;">
                ${code}
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Bu kod <strong>5 dakika</strong> geçerlidir.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              ⚠️ Bu kodu kimseyle paylaşmayın. Giriş yapmadıysanız, bu mesajı dikkate almayın.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
              © 2025 Online Muayene
            </p>
          </div>
        </body>
        </html>
      `;

      await sendEmail(user.email, "Doğrulama Kodu - Online Muayene", emailHtml);
    } else if (method === "SMS") {
      if (!user.phone) {
        return { success: false, error: "Telefon numarası bulunamadı" };
      }

      const smsMessage = `Online Muayene doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`;
      await sendSMS(user.phone, smsMessage);
    }

    return { success: true };
  } catch (error: any) {
    console.error("2FA code send error:", error);
    return { success: false, error: error.message };
  }
}

// 2FA kodunu doğrula
export async function verify2FACode(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Token'ı bul
    const token = await prisma.verificationToken.findFirst({
      where: {
        userId,
        token: code,
        type: "TWO_FACTOR",
        expiresAt: {
          gt: new Date(), // Henüz geçmemiş
        },
      },
    });

    if (!token) {
      return { success: false, error: "Geçersiz veya süresi dolmuş kod" };
    }

    // Token'ı sil (tek kullanımlık)
    await prisma.verificationToken.delete({
      where: { id: token.id },
    });

    return { success: true };
  } catch (error: any) {
    console.error("2FA verify error:", error);
    return { success: false, error: error.message };
  }
}

