import nodemailer from "nodemailer";

// SMTP transporter oluştur
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email gönderme fonksiyonu
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    // SMTP bilgileri yoksa sadece loglayıp true dön (development)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("📧 Email gönderiliyor (SMTP yapılandırılmamış):");
      console.log("To:", to);
      console.log("Subject:", subject);
      console.log("Body:", html.substring(0, 100) + "...");
      return true;
    }

    const info = await transporter.sendMail({
      from: `"Online Muayene" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email gönderildi:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("❌ Email gönderme hatası:", error);
    // Email gönderilmese bile sistem çalışmaya devam etsin
    return false;
  }
}

// Email şablonları
export const emailTemplates = {
  // Randevu oluşturuldu
  appointmentCreated: (data: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    hospital?: string;
  }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Online Muayene</h1>
            <p style="color: #6b7280; margin-top: 10px;">Randevu Onayı</p>
          </div>
          
          <!-- Content -->
          <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Merhaba ${data.patientName},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Randevunuz başarıyla oluşturulmuştur.
            </p>
            
            <!-- Randevu Detayları -->
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
              <p style="margin: 10px 0; color: #374151;"><strong>Doktor:</strong> ${data.doctorName}</p>
              <p style="margin: 10px 0; color: #374151;"><strong>Tarih:</strong> ${data.date}</p>
              <p style="margin: 10px 0; color: #374151;"><strong>Saat:</strong> ${data.time}</p>
              ${data.hospital ? `<p style="margin: 10px 0; color: #374151;"><strong>Hastane:</strong> ${data.hospital}</p>` : ""}
            </div>
          </div>
          
          <!-- İnfo -->
          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              ℹ️ Randevu saatinden 15 dakika önce görüntülü görüşme linki aktif olacaktır.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
              Bu otomatik bir bildirimdir. Lütfen bu e-postaya yanıt vermeyiniz.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 5px 0;">
              © 2025 Online Muayene
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Görüşme başlatıldı
  meetingStarted: (data: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    meetingLink: string;
  }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; margin: 0; font-size: 28px;">✓ Görüşme Başlatıldı</h1>
          </div>
          
          <!-- Content -->
          <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Sayın ${data.patientName},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Doktorunuz <strong>${data.doctorName}</strong> görüşmeyi başlattı.
            </p>
            
            <!-- Meeting Link -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.meetingLink}" style="display: inline-block; background-color: #16a34a; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Görüşmeye Katıl
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              Veya şu linki kopyalayın: <br>
              <span style="color: #2563eb; word-break: break-all; font-size: 12px;">${data.meetingLink}</span>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
              Bu otomatik bir bildirimdir. Lütfen bu e-postaya yanıt vermeyiniz.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 5px 0;">
              © 2025 Online Muayene
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Email doğrulama
  verifyEmail: (data: {
    name: string;
    verificationUrl: string;
  }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 28px;">Online Muayene</h1>
            <p style="color: #6b7280; margin-top: 10px;">Email Doğrulama</p>
          </div>
          
          <!-- Content -->
          <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Merhaba ${data.name},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Online Muayene platformuna hoş geldiniz! Email adresinizi doğrulamak için lütfen aşağıdaki butona tıklayın.
            </p>
            
            <!-- Verification Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Email Adresimi Doğrula
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              Eğer buton çalışmıyorsa, şu linki kopyalayıp tarayıcınıza yapıştırın: <br>
              <span style="color: #2563eb; word-break: break-all; font-size: 12px;">${data.verificationUrl}</span>
            </p>
          </div>
          
          <!-- Warning -->
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              ⚠️ Bu email'i siz istemediyseniz, güvenliğiniz için lütfen dikkate almayınız.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
              Bu otomatik bir bildirimdir. Lütfen bu e-postaya yanıt vermeyiniz.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 5px 0;">
              © 2025 Online Muayene
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Şifre sıfırlama
  resetPassword: (data: {
    name: string;
    resetUrl: string;
  }) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 28px;">🔒 Şifre Sıfırlama</h1>
          </div>
          
          <!-- Content -->
          <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">Merhaba ${data.name},</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Şifrenizi sıfırlamak için bir talepte bulundunuz. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.
            </p>
            
            <!-- Reset Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Şifremi Sıfırla
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              Eğer buton çalışmıyorsa, şu linki kopyalayıp tarayıcınıza yapıştırın: <br>
              <span style="color: #2563eb; word-break: break-all; font-size: 12px;">${data.resetUrl}</span>
            </p>
          </div>
          
          <!-- Warning -->
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 25px;">
            <p style="margin: 0; color: #991b1b; font-size: 13px;">
              ⚠️ Bu linkin geçerlilik süresi <strong>1 saat</strong>dır.
            </p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              ⚠️ Bu talebi siz yapmadıysanız, bu e-postayı dikkate almayınız. Şifreniz değiştirilmeyecektir.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; padding-top: 25px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0;">
              Bu otomatik bir bildirimdir. Lütfen bu e-postaya yanıt vermeyiniz.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 5px 0;">
              © 2025 Online Muayene
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};

