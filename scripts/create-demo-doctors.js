const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoDoctors() {
  try {
    console.log('🚀 Demo doktorlar oluşturuluyor...\n');

    const demoDoctors = [
      {
        name: 'Dr. Ahmet Yılmaz',
        email: 'ahmet.yilmaz@demo.com',
        password: 'demo123',
        phone: '05551234567',
        specialization: 'Kardiyoloji',
        licenseNumber: 'DEMO001',
        tcKimlikNo: '11111111111',
        hospital: 'Özel Acıbadem Bursa Hastanesi',
        university: 'İstanbul Üniversitesi',
        graduationYear: 2010,
        workStatus: 'Tam Zamanlı',
        city: 'Bursa',
        experience: 14,
        bio: 'Kardiyoloji alanında 14 yıllık deneyime sahip uzman doktor. Kalp ve damar hastalıkları konusunda uzmanlaşmıştır.',
      },
      {
        name: 'Dr. Ayşe Demir',
        email: 'ayse.demir@demo.com',
        password: 'demo123',
        phone: '05559876543',
        specialization: 'Nöroloji',
        licenseNumber: 'DEMO002',
        tcKimlikNo: '22222222222',
        hospital: 'Özel Acıbadem Bursa Hastanesi',
        university: 'Ankara Üniversitesi',
        graduationYear: 2012,
        workStatus: 'Tam Zamanlı',
        city: 'Bursa',
        experience: 12,
        bio: 'Nöroloji alanında 12 yıllık deneyime sahip uzman doktor. Sinir sistemi hastalıkları konusunda uzmanlaşmıştır.',
      },
    ];

    for (const doctor of demoDoctors) {
      // Email kontrolü
      const existingUser = await prisma.user.findUnique({
        where: { email: doctor.email },
      });

      if (existingUser) {
        console.log(`⚠️  ${doctor.email} zaten mevcut, atlanıyor...`);
        continue;
      }

      // Lisans numarası kontrolü
      const existingLicense = await prisma.doctorProfile.findUnique({
        where: { licenseNumber: doctor.licenseNumber },
      });

      if (existingLicense) {
        console.log(`⚠️  ${doctor.licenseNumber} lisans numarası zaten mevcut, atlanıyor...`);
        continue;
      }

      // Şifreyi hash'le
      const hashedPassword = await bcrypt.hash(doctor.password, 12);

      // Kullanıcı ve doktor profilini oluştur
      const user = await prisma.user.create({
        data: {
          email: doctor.email,
          password: hashedPassword,
          name: doctor.name,
          phone: doctor.phone,
          role: 'DOCTOR',
          doctorProfile: {
            create: {
              specialization: doctor.specialization,
              licenseNumber: doctor.licenseNumber,
              tcKimlikNo: doctor.tcKimlikNo,
              hospital: doctor.hospital,
              university: doctor.university,
              graduationYear: doctor.graduationYear,
              workStatus: doctor.workStatus,
              city: doctor.city,
              experience: doctor.experience,
              bio: doctor.bio,
              verificationStatus: 'PENDING', // Onay bekliyor
              emailVerified: false,
            },
          },
        },
        include: {
          doctorProfile: true,
        },
      });

      console.log(`✅ ${doctor.name} başarıyla oluşturuldu!`);
      console.log(`   Email: ${doctor.email}`);
      console.log(`   Şifre: ${doctor.password}`);
      console.log(`   Durum: PENDING (Onay Bekliyor)\n`);
    }

    console.log('🎉 Demo doktorlar oluşturuldu!');
    console.log('📋 Admin panelinden "Onay Bekleyenler" sekmesinde görüntüleyebilirsiniz.');
  } catch (error) {
    console.error('❌ Hata oluştu:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoDoctors();

