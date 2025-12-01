/**
 * Telif Başvurusu İçin Demo Hesaplar Oluşturma Script'i
 * 
 * Bu script, e-devlet telif başvurusu kontrolü için demo hesaplar oluşturur.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoAccounts() {
  try {
    console.log('🚀 Demo hesaplar oluşturuluyor...\n');

    // Önce mevcut demo hesapları kontrol et ve sil
    const existingDoctor = await prisma.user.findUnique({
      where: { email: 'demo.doktor@onlinemuayene.com' },
      include: { doctorProfile: true },
    });

    if (existingDoctor) {
      console.log('⚠️  Mevcut demo doktor hesabı bulundu, siliniyor...');
      await prisma.user.delete({
        where: { id: existingDoctor.id },
      });
    }

    // TC Kimlik No çakışması kontrolü (mevcut doktor silindikten sonra)
    let doctorTcNo = '12345678901';
    const existingTcDoctor = await prisma.doctorProfile.findUnique({
      where: { tcKimlikNo: '12345678901' },
    });

    if (existingTcDoctor) {
      console.log('⚠️  TC Kimlik No çakışması var, farklı TC No kullanılıyor...');
      // Farklı bir TC No kullan (son rakamı değiştir)
      doctorTcNo = '12345678902';
      
      // Yeni TC No da çakışıyorsa bir sonrakini dene
      const existingTcDoctor2 = await prisma.doctorProfile.findUnique({
        where: { tcKimlikNo: '12345678902' },
      });
      
      if (existingTcDoctor2) {
        doctorTcNo = '12345678903';
      }
    }

    // Demo Doktor
    const doctorPassword = await bcrypt.hash('DemoDoktor123!', 10);
    const doctor = await prisma.user.create({
      data: {
        email: 'demo.doktor@onlinemuayene.com',
        password: doctorPassword,
        name: 'Dr. Demo Doktor',
        role: 'DOCTOR',
        phone: '05551234567',
        doctorProfile: {
          create: {
            specialization: 'Aile Hekimliği',
            licenseNumber: 'DEMO123456',
            tcKimlikNo: doctorTcNo,
            bio: 'Bu bir demo doktor hesabıdır. Telif başvurusu kontrolü için oluşturulmuştur.',
            experience: 10,
            hospital: 'Demo Hastanesi',
            university: 'Demo Üniversitesi',
            graduationYear: 2010,
            workStatus: 'Tam Zamanlı',
            city: 'İstanbul',
            appointmentPrice: 200,
            verificationStatus: 'APPROVED',
            verifiedAt: new Date(),
            emailVerified: true,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    console.log('✅ Demo Doktor oluşturuldu:');
    console.log(`   Email: demo.doktor@onlinemuayene.com`);
    console.log(`   Şifre: DemoDoktor123!`);
    console.log(`   ID: ${doctor.id}\n`);

    // Mevcut demo hasta kontrolü
    const existingPatient = await prisma.user.findUnique({
      where: { email: 'demo.hasta@onlinemuayene.com' },
      include: { patientProfile: true },
    });

    if (existingPatient) {
      console.log('⚠️  Mevcut demo hasta hesabı bulundu, siliniyor...');
      await prisma.user.delete({
        where: { id: existingPatient.id },
      });
    }

    // TC Kimlik No çakışması kontrolü (mevcut hasta silindikten sonra)
    let patientTcNo = '98765432109';
    const existingTcPatient = await prisma.patientProfile.findUnique({
      where: { tcKimlikNo: '98765432109' },
    });

    if (existingTcPatient) {
      console.log('⚠️  TC Kimlik No çakışması var, farklı TC No kullanılıyor...');
      // Farklı bir TC No kullan (son rakamı değiştir)
      patientTcNo = '98765432108';
      
      // Yeni TC No da çakışıyorsa bir sonrakini dene
      const existingTcPatient2 = await prisma.patientProfile.findUnique({
        where: { tcKimlikNo: '98765432108' },
      });
      
      if (existingTcPatient2) {
        patientTcNo = '98765432107';
      }
    }

    // Demo Hasta
    const patientPassword = await bcrypt.hash('DemoHasta123!', 10);
    const patient = await prisma.user.create({
      data: {
        email: 'demo.hasta@onlinemuayene.com',
        password: patientPassword,
        name: 'Demo Hasta',
        role: 'PATIENT',
        phone: '05559876543',
        patientProfile: {
          create: {
            tcKimlikNo: patientTcNo,
            dateOfBirth: new Date('1990-01-01'),
            gender: 'Erkek',
            address: 'Demo Adres, Demo Mahalle, İstanbul',
            emergencyContact: 'Demo Acil Kişi',
            emergencyPhone: '05551111111',
            bloodType: 'A Rh+',
            allergies: 'Polen',
            chronicDiseases: 'Yok',
            medications: 'Yok',
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    console.log('✅ Demo Hasta oluşturuldu:');
    console.log(`   Email: demo.hasta@onlinemuayene.com`);
    console.log(`   Şifre: DemoHasta123!`);
    console.log(`   ID: ${patient.id}\n`);

    // Demo Randevu (opsiyonel) - Mevcut randevuları kontrol et
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Yarın
    appointmentDate.setHours(14, 0, 0, 0); // Saat 14:00

    // Mevcut demo randevuları sil
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { doctorId: doctor.id },
          { patientId: patient.id },
        ],
      },
    });

    if (existingAppointments.length > 0) {
      console.log(`⚠️  ${existingAppointments.length} mevcut demo randevu bulundu, siliniyor...`);
      await prisma.appointment.deleteMany({
        where: {
          OR: [
            { doctorId: doctor.id },
            { patientId: patient.id },
          ],
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        appointmentDate: appointmentDate,
        status: 'CONFIRMED',
        notes: 'Demo randevu - Telif başvurusu kontrolü için',
        paymentAmount: 200,
        paymentDate: new Date(),
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
      },
    });

    console.log('✅ Demo Randevu oluşturuldu:');
    console.log(`   Randevu ID: ${appointment.id}`);
    console.log(`   Tarih: ${appointmentDate.toLocaleString('tr-TR')}\n`);

    console.log('✨ Demo hesaplar başarıyla oluşturuldu!\n');
    console.log('📋 DEMO HESAP BİLGİLERİ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DOKTOR:');
    console.log('  Email: demo.doktor@onlinemuayene.com');
    console.log('  Şifre: DemoDoktor123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('HASTA:');
    console.log('  Email: demo.hasta@onlinemuayene.com');
    console.log('  Şifre: DemoHasta123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 Bu bilgileri README.md veya ayrı bir DEMO_ACCOUNTS.md dosyasına ekleyebilirsiniz.');

  } catch (error) {
    console.error('❌ Hata:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
createDemoAccounts()
  .then(() => {
    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ İşlem başarısız:', error);
    process.exit(1);
  });

