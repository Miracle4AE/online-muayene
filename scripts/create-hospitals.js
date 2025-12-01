const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🏥 Hastaneler oluşturuluyor...");

  // Test hastaneleri
  const hospitals = [
    {
      name: "Özel Acıbadem Bursa Hastanesi",
      address: "Nilüfer, Bursa",
      city: "Bursa",
      phone: "0224 000 00 00",
      email: "info@acibadem-bursa.com",
      adminEmails: "admin@acibadem-bursa.com,yonetim@acibadem-bursa.com",
    },
    {
      name: "Bursa Şehir Hastanesi",
      address: "Yıldırım, Bursa",
      city: "Bursa",
      phone: "0224 111 11 11",
      email: "info@bursasehir.gov.tr",
      adminEmails: "admin@bursasehir.gov.tr",
    },
    {
      name: "Özel Memorial Bursa Hastanesi",
      address: "Osmangazi, Bursa",
      city: "Bursa",
      phone: "0224 222 22 22",
      email: "info@memorial-bursa.com",
      adminEmails: "admin@memorial-bursa.com",
    },
  ];

  for (const hospital of hospitals) {
    const existing = await prisma.hospital.findUnique({
      where: { name: hospital.name },
    });

    if (existing) {
      console.log(`✓ ${hospital.name} zaten mevcut`);
      continue;
    }

    const created = await prisma.hospital.create({
      data: hospital,
    });

    console.log(`✓ ${created.name} oluşturuldu`);
  }

  console.log("\n🎉 Hastaneler başarıyla oluşturuldu!");
  
  // Hastaneleri listele
  const allHospitals = await prisma.hospital.findMany();
  console.log("\n📋 Mevcut Hastaneler:");
  allHospitals.forEach((h, i) => {
    console.log(`${i + 1}. ${h.name} (ID: ${h.id})`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

