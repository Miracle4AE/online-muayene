const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDemoAppointment() {
  try {
    // Demo hasta ve doktor bul
    const patient = await prisma.user.findFirst({
      where: { 
        role: 'PATIENT',
        email: 'mehmet.kaya@demo.com'
      }
    });

    const doctor = await prisma.user.findFirst({
      where: { 
        role: 'DOCTOR',
        doctorProfile: {
          verificationStatus: 'APPROVED'
        }
      },
      include: {
        doctorProfile: true
      }
    });

    if (!patient) {
      console.error('Demo hasta bulunamadı! Önce demo hasta oluşturun.');
      return;
    }

    if (!doctor) {
      console.error('Onaylanmış doktor bulunamadı!');
      return;
    }

    // 10 dakika sonra bir randevu oluştur (test için - 15 dakika kuralına göre hemen aktif olacak)
    const appointmentDate = new Date();
    appointmentDate.setMinutes(appointmentDate.getMinutes() + 10);
    appointmentDate.setSeconds(0, 0);

    // Meeting link oluştur
    const meetingId = `appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const meetingLink = `https://meet.jit.si/${meetingId}`;

    // Randevuyu oluştur
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        appointmentDate: appointmentDate,
        status: 'CONFIRMED',
        notes: 'Demo görüşme - Test amaçlı',
        meetingLink: meetingLink,
      },
      include: {
        doctor: {
          select: {
            name: true,
            email: true,
          }
        },
        patient: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    console.log('✅ Demo randevu başarıyla oluşturuldu!');
    console.log('\n📋 Randevu Detayları:');
    console.log(`   ID: ${appointment.id}`);
    console.log(`   Doktor: ${appointment.doctor.name} (${appointment.doctor.email})`);
    console.log(`   Hasta: ${appointment.patient.name} (${appointment.patient.email})`);
    console.log(`   Tarih/Saat: ${appointmentDate.toLocaleString('tr-TR')}`);
    console.log(`   Durum: ${appointment.status}`);
    console.log(`   Meeting Link: ${appointment.meetingLink}`);
    console.log(`\n⏰ Randevu ${Math.floor((appointmentDate.getTime() - new Date().getTime()) / 1000 / 60)} dakika sonra başlayacak.`);
    console.log(`\n🔗 Hasta girişi yapıp "Doktor ile Görüntülü Randevu" bölümünden görüşmeye katılabilir.`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoAppointment();

