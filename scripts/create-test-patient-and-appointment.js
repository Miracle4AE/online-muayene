const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestPatientAndAppointment() {
  const patientEmail = "hasta@test.com";
  const patientPassword = "hasta123";
  const patientName = "Ahmet Yılmaz";
  const tcKimlikNo = "12345678902";
  
  // Test doktor email'i (zaten var olmalı)
  const doctorEmail = "doktor@test.com";

  try {
    // Doktoru bul
    const doctor = await prisma.user.findUnique({
      where: { email: doctorEmail },
      include: { doctorProfile: true },
    });

    if (!doctor) {
      console.log("❌ Test doktor bulunamadı! Önce test doktoru oluşturun: npm run create-test-doctor");
      return;
    }

    // Hasta var mı kontrol et
    let patient = await prisma.user.findUnique({
      where: { email: patientEmail },
      include: { patientProfile: true },
    });

    if (patient) {
      console.log(`⚠️ Hasta hesabı zaten mevcut: ${patientEmail}`);
    } else {
      // Hasta oluştur
      const hashedPassword = await bcrypt.hash(patientPassword, 10);
      
      patient = await prisma.user.create({
        data: {
          email: patientEmail,
          password: hashedPassword,
          name: patientName,
          role: "PATIENT",
          phone: "05321234567",
          patientProfile: {
            create: {
              tcKimlikNo: tcKimlikNo,
              dateOfBirth: new Date("1985-05-15"),
              gender: "MALE",
              bloodType: "A+",
              allergies: "Penisilin, Polen",
              chronicDiseases: "Hipertansiyon\nAilede: Diyabet, Kalp Hastalığı",
              medications: "Lisinopril 10mg (günde 1 kez)",
              address: "Bursa, Nilüfer, Örnek Mahallesi, Test Sokak No:123",
              emergencyContact: "Ayşe Yılmaz",
              emergencyPhone: "05329876543",
            },
          },
        },
        include: {
          patientProfile: true,
        },
      });

      console.log("✅ Test hasta hesabı oluşturuldu!");
    }

    // Bugün için randevu oluştur
    const now = new Date();
    const today = new Date();
    today.setFullYear(now.getFullYear());
    today.setMonth(now.getMonth());
    today.setDate(now.getDate());
    
    // Eğer şu an saat 14:30'dan sonraysa, bugün saat 16:00 için oluştur
    // Değilse bugün saat 14:30 için oluştur
    if (now.getHours() >= 14 && now.getMinutes() >= 30) {
      today.setHours(16, 0, 0, 0); // Bugün saat 16:00
    } else {
      today.setHours(14, 30, 0, 0); // Bugün saat 14:30
    }

    // Bugünkü randevuları kontrol et
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        patientId: patient.id,
        appointmentDate: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (existingAppointment) {
      // Mevcut randevuyu bugünün tarihine güncelle
      const updatedAppointment = await prisma.appointment.update({
        where: { id: existingAppointment.id },
        data: {
          appointmentDate: today,
          status: "CONFIRMED",
          notes: "Baş ağrısı ve mide bulantısı şikayeti var. Son 3 gündür devam ediyor. Ateş yok.",
        },
      });

      console.log("✅ Mevcut randevu bugünün tarihine güncellendi!");
      console.log("\n📋 Randevu Bilgileri:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Randevu ID: ${updatedAppointment.id}`);
      console.log(`   Tarih: ${updatedAppointment.appointmentDate.toLocaleString("tr-TR")}`);
      console.log(`   Durum: ${updatedAppointment.status}`);
      console.log(`   Hasta: ${patient.name}`);
      console.log(`   Doktor: ${doctor.name}`);
      console.log(`   Şikayet: ${updatedAppointment.notes}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } else {
      // Yeni randevu oluştur
      const appointment = await prisma.appointment.create({
        data: {
          doctorId: doctor.id,
          patientId: patient.id,
          appointmentDate: today,
          status: "CONFIRMED",
          notes: "Baş ağrısı ve mide bulantısı şikayeti var. Son 3 gündür devam ediyor. Ateş yok.",
        },
      });

      console.log("✅ Bugün için test randevusu oluşturuldu!");
      console.log("\n📋 Randevu Bilgileri:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`   Randevu ID: ${appointment.id}`);
      console.log(`   Tarih: ${appointment.appointmentDate.toLocaleString("tr-TR")}`);
      console.log(`   Durum: ${appointment.status}`);
      console.log(`   Hasta: ${patient.name}`);
      console.log(`   Doktor: ${doctor.name}`);
      console.log(`   Şikayet: ${appointment.notes}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    console.log("\n📋 Hasta Giriş Bilgileri:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`   Email    : ${patient.email}`);
    console.log(`   Şifre    : ${patientPassword}`);
    console.log(`   Ad       : ${patient.name}`);
    console.log(`   T.C. No  : ${patient.patientProfile?.tcKimlikNo}`);
    console.log(`   Yaş      : ${patient.patientProfile?.dateOfBirth ? Math.floor((new Date() - new Date(patient.patientProfile.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : "N/A"} yaşında`);
    console.log(`   Alerjiler: ${patient.patientProfile?.allergies || "Yok"}`);
    console.log(`   Kronik   : ${patient.patientProfile?.chronicDiseases || "Yok"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🔗 Doktor giriş sayfası: http://localhost:3000/auth/login");
    console.log("🔗 Hasta giriş sayfası: http://localhost:3000/auth/login");

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestPatientAndAppointment();

