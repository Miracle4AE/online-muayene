const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDoctorData() {
  const doctorEmail = "doktor@test.com";
  const patientEmail = "hasta@test.com";

  try {
    // Doktoru bul
    const doctor = await prisma.user.findUnique({
      where: { email: doctorEmail },
      include: { doctorProfile: true },
    });

    if (!doctor) {
      console.log("❌ Test doktor bulunamadı!");
      return;
    }

    console.log(`✅ Doktor bulundu: ${doctor.name} (ID: ${doctor.id})`);
    console.log(`   Onay Durumu: ${doctor.doctorProfile?.verificationStatus || "YOK"}`);

    // Hastayı bul
    const patient = await prisma.user.findUnique({
      where: { email: patientEmail },
      include: { patientProfile: true },
    });

    if (!patient) {
      console.log("❌ Test hasta bulunamadı!");
      return;
    }

    console.log(`✅ Hasta bulundu: ${patient.name} (ID: ${patient.id})`);

    // Bugünkü randevuları kontrol et
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`\n📅 Bugünkü Randevular: ${todayAppointments.length}`);
    todayAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.patient.name} - ${new Date(apt.appointmentDate).toLocaleString("tr-TR")} - ${apt.status}`);
    });

    // Bu haftaki randevuları kontrol et
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    });

    console.log(`\n📅 Bu Haftaki Randevular: ${weeklyAppointments.length}`);

    // Toplam hasta sayısı
    const allAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
      },
      select: {
        patientId: true,
      },
      distinct: ["patientId"],
    });

    console.log(`\n👥 Toplam Hasta: ${allAppointments.length}`);

    // Bekleyen raporlar
    const pendingReports = await prisma.medicalReport.findMany({
      where: {
        doctorId: doctor.id,
        approvalStatus: "PENDING",
      },
    });

    console.log(`\n📋 Bekleyen Raporlar: ${pendingReports.length}`);

    // Tüm randevuları göster
    const allAppts = await prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        appointmentDate: "desc",
      },
      take: 10,
    });

    console.log(`\n📋 Son 10 Randevu:`);
    allAppts.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.patient.name} - ${new Date(apt.appointmentDate).toLocaleString("tr-TR")} - ${apt.status}`);
    });

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDoctorData();

