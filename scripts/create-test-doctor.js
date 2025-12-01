const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestDoctor() {
  try {
    // Test doktor bilgileri
    const testDoctor = {
      email: 'doktor@test.com',
      password: 'doktor123',
      name: 'Dr. Test Doktor',
      phone: '05551234567',
      role: 'DOCTOR',
      specialization: 'Kardiyoloji',
      licenseNumber: 'TEST123456',
      tcKimlikNo: '12345678901',
      hospital: 'Özel Acıbadem Bursa Hastanesi',
      city: 'Bursa',
      university: 'İstanbul Üniversitesi',
      graduationYear: 2010,
      workStatus: 'Tam Zamanlı',
      experience: 14,
      bio: 'Test doktor hesabı - Deneme amaçlı oluşturulmuştur.',
    };

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: testDoctor.email },
    });

    if (existingUser) {
      console.log('❌ Bu email adresi zaten kullanılıyor:', testDoctor.email);
      console.log('✅ Mevcut hesap bilgileri:');
      console.log('   Email:', testDoctor.email);
      console.log('   Şifre:', testDoctor.password);
      console.log('   Ad:', existingUser.name);
      return;
    }

    // T.C. Kimlik No kontrolü
    const existingTcKimlik = await prisma.doctorProfile.findUnique({
      where: { tcKimlikNo: testDoctor.tcKimlikNo },
    });

    if (existingTcKimlik) {
      console.log('❌ Bu T.C. Kimlik No zaten kullanılıyor');
      return;
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(testDoctor.password, 12);

    // Kullanıcı ve doktor profilini oluştur
    const user = await prisma.user.create({
      data: {
        email: testDoctor.email,
        password: hashedPassword,
        name: testDoctor.name,
        phone: testDoctor.phone,
        role: testDoctor.role,
        doctorProfile: {
          create: {
            specialization: testDoctor.specialization,
            licenseNumber: testDoctor.licenseNumber,
            tcKimlikNo: testDoctor.tcKimlikNo,
            hospital: testDoctor.hospital,
            city: testDoctor.city,
            university: testDoctor.university,
            graduationYear: testDoctor.graduationYear,
            workStatus: testDoctor.workStatus,
            experience: testDoctor.experience,
            bio: testDoctor.bio,
            verificationStatus: 'APPROVED', // Otomatik onaylı
            emailVerified: true, // Email doğrulanmış
            verifiedAt: new Date(),
            verifiedBy: 'SYSTEM',
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    console.log('✅ Test doktor hesabı başarıyla oluşturuldu!');
    console.log('');
    console.log('📋 Giriş Bilgileri:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Email    :', testDoctor.email);
    console.log('   Şifre    :', testDoctor.password);
    console.log('   Ad       :', testDoctor.name);
    console.log('   Uzmanlık :', testDoctor.specialization);
    console.log('   Hastane  :', testDoctor.hospital);
    console.log('   Durum    : Onaylı (APPROVED)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔗 Giriş sayfası: http://localhost:3000/auth/login');
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDoctor();

