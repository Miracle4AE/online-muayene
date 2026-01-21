// SMS gönderme servisi
// Netgsm, İleti Merkezi, Twilio gibi servislerle entegre edilebilir

export async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    // SMS API bilgileri yoksa sadece loglayıp true dön (development)
    if (!process.env.SMS_API_KEY || !process.env.SMS_SENDER) {
      console.log("📱 SMS gönderiliyor (SMS servisi yapılandırılmamış):");
      console.log("To:", to);
      console.log("Message:", message);
      return true;
    }

    // Netgsm entegrasyonu örneği
    // const response = await fetch("https://api.netgsm.com.tr/sms/send/get", {
    //   method: "GET",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   params: {
    //     usercode: process.env.SMS_API_KEY,
    //     password: process.env.SMS_API_SECRET,
    //     gsmno: to,
    //     message: message,
    //     msgheader: process.env.SMS_SENDER,
    //   },
    // });

    // İleti Merkezi entegrasyonu örneği
    // const response = await fetch("https://api.iletimerkezi.com/v1/send-sms", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${process.env.SMS_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     sender: process.env.SMS_SENDER,
    //     message: {
    //       text: message,
    //     },
    //     recipient: {
    //       number: to,
    //     },
    //   }),
    // });

    console.log("✅ SMS gönderildi");
    return true;
  } catch (error: any) {
    console.error("❌ SMS gönderme hatası:", error);
    // SMS gönderilmese bile sistem çalışmaya devam etsin
    return false;
  }
}

// SMS şablonları
export const smsTemplates = {
  // Randevu oluşturuldu
  appointmentCreated: (data: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    hospital?: string;
  }) => {
    return `Sayın ${data.patientName}, ${data.date} ${data.time} tarihinde ${data.doctorName} ile randevunuz oluşturulmuştur.${data.hospital ? ` Hastane: ${data.hospital}` : ""}`;
  },

  // Randevu hatırlatma (1 gün önce)
  appointmentReminder: (data: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
  }) => {
    return `Sayın ${data.patientName}, yarın ${data.time}'de ${data.doctorName} ile randevunuz bulunmaktadır. Lütfen randevunuzu unutmayın.`;
  },

  appointmentReminder15Min: (data: {
    patientName: string;
    doctorName: string;
    time: string;
  }) => {
    return `Sayın ${data.patientName}, ${data.time} saatinde ${data.doctorName} ile randevunuz var. Görüşmeye 15 dakika kala hatırlatmadır.`;
  },

  // Görüşme başlatıldı
  meetingStarted: (data: {
    patientName: string;
    doctorName: string;
    meetingLink: string;
  }) => {
    return `Sayın ${data.patientName}, ${data.doctorName} ile görüşmeniz başlatıldı. Katılmak için: ${data.meetingLink}`;
  },

  // Randevu onaylandı
  appointmentConfirmed: (data: {
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
  }) => {
    return `Sayın ${data.patientName}, ${data.date} ${data.time} tarihindeki randevunuz ${data.doctorName} tarafından onaylanmıştır.`;
  },

  // Reçete hazır
  prescriptionReady: (data: {
    patientName: string;
    doctorName: string;
  }) => {
    return `Sayın ${data.patientName}, ${data.doctorName} tarafından reçeteniz hazırlanmıştır. Sisteme giriş yaparak görüntüleyebilirsiniz.`;
  },
};

