const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAppointmentPrice() {
  try {
    const profiles = await prisma.doctorProfile.findMany({
      select: {
        id: true,
        userId: true,
        appointmentPrice: true,
      },
      take: 10,
    });

    console.log('Doctor Profiles with appointmentPrice:');
    profiles.forEach((p) => {
      console.log(`ID: ${p.id}, UserID: ${p.userId}, Price: ${p.appointmentPrice}`);
    });

    // Şimdi user ile birlikte çekelim
    const users = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      include: {
        doctorProfile: {
          select: {
            id: true,
            appointmentPrice: true,
          },
        },
      },
      take: 5,
    });

    console.log('\nUsers with doctorProfile:');
    users.forEach((u) => {
      console.log(`User: ${u.name}, Profile ID: ${u.doctorProfile?.id}, Price: ${u.doctorProfile?.appointmentPrice}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAppointmentPrice();

