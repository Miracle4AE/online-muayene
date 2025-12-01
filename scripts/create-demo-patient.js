const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoPatient() {
  try {
    console.log('🚀 Demo hasta profili oluşturuluyor...\n');

    const demoPatient = {
      name: 'Mehmet Kaya',
      email: 'mehmet.kaya@demo.com',
      password: 'demo123',
      phone: '05551234568',
      tcKimlikNo: '33333333333',
      dateOfBirth: new Date('1985-05-15'),
      gender: 'Erkek',
      address: 'Bursa, Nilüfer, Özlüce Mahallesi, Demo Sokak No: 123',
      emergencyContact: 'Ayşe Kaya',
      emergencyPhone: '05559876544',
      bloodType: 'A Rh+',
      allergies: 'Penisilin, Polen',
      chronicDiseases: 'Hipertansiyon',
      medications: 'Lisinopril 10mg (günde 1 kez)',
    };

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email: demoPatient.email },
    });

    if (existingUser) {
      console.log(`⚠️  ${demoPatient.email} zaten mevcut, atlanıyor...`);
      await prisma.$disconnect();
      return;
    }

    // T.C. Kimlik No kontrolü
    const existingTcKimlikNo = await prisma.patientProfile.findUnique({
      where: { tcKimlikNo: demoPatient.tcKimlikNo },
    });

    if (existingTcKimlikNo) {
      console.log(`⚠️  ${demoPatient.tcKimlikNo} T.C. Kimlik No zaten mevcut, atlanıyor...`);
      await prisma.$disconnect();
      return;
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(demoPatient.password, 12);

    // Kullanıcı ve hasta profilini oluştur
    const user = await prisma.user.create({
      data: {
        email: demoPatient.email,
        password: hashedPassword,
        name: demoPatient.name,
        phone: demoPatient.phone,
        role: 'PATIENT',
        patientProfile: {
          create: {
            tcKimlikNo: demoPatient.tcKimlikNo,
            dateOfBirth: demoPatient.dateOfBirth,
            gender: demoPatient.gender,
            address: demoPatient.address,
            emergencyContact: demoPatient.emergencyContact,
            emergencyPhone: demoPatient.emergencyPhone,
            bloodType: demoPatient.bloodType,
            allergies: demoPatient.allergies,
            chronicDiseases: demoPatient.chronicDiseases,
            medications: demoPatient.medications,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    console.log('✅ Demo hasta profili başarıyla oluşturuldu!');
    console.log('');
    console.log('📋 Hasta Bilgileri:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Ad Soyad      :', demoPatient.name);
    console.log('   Email         :', demoPatient.email);
    console.log('   Şifre         :', demoPatient.password);
    console.log('   Telefon       :', demoPatient.phone);
    console.log('   T.C. Kimlik No:', demoPatient.tcKimlikNo);
    console.log('   Doğum Tarihi  :', demoPatient.dateOfBirth.toLocaleDateString('tr-TR'));
    console.log('   Cinsiyet      :', demoPatient.gender);
    console.log('   Kan Grubu     :', demoPatient.bloodType);
    console.log('   Adres         :', demoPatient.address);
    console.log('   Acil İletişim :', demoPatient.emergencyContact);
    console.log('   Acil Telefon  :', demoPatient.emergencyPhone);
    console.log('   Alerjiler     :', demoPatient.allergies);
    console.log('   Kronik Hastalık:', demoPatient.chronicDiseases);
    console.log('   İlaçlar       :', demoPatient.medications);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🔗 Giriş sayfası: http://localhost:3000/auth/login');
    console.log('   Hasta paneline giriş yapabilirsiniz.');
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoPatient();

