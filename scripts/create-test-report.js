const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestReport() {
  const doctorEmail = "doktor@test.com";
  const patientEmail = "hasta@test.com";

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

    // Hastayı bul
    const patient = await prisma.user.findUnique({
      where: { email: patientEmail },
      include: { patientProfile: true },
    });

    if (!patient) {
      console.log("❌ Test hasta bulunamadı! Önce test hastayı oluşturun: npm run create-test-patient");
      return;
    }

    // Mevcut raporları kontrol et
    const existingReports = await prisma.medicalReport.findMany({
      where: {
        doctorId: doctor.id,
        patientId: patient.id,
      },
    });

    if (existingReports.length > 0) {
      console.log(`⚠️ Zaten ${existingReports.length} rapor mevcut!`);
      console.log("\n📋 Mevcut Raporlar:");
      existingReports.forEach((report, index) => {
        console.log(`\n${index + 1}. Rapor:`);
        console.log(`   ID: ${report.id}`);
        console.log(`   Tip: ${report.reportType}`);
        console.log(`   Başlık: ${report.title || "Başlık yok"}`);
        console.log(`   Tarih: ${new Date(report.reportDate).toLocaleString("tr-TR")}`);
      });
      return;
    }

    // Test raporları oluştur
    const testReports = [
      {
        reportType: "Tahlil",
        title: "Kan Tahlili Sonuçları",
        content: "Hastanın kan tahlili sonuçları:\n\n- Hemoglobin: 14.2 g/dL (Normal)\n- Lökosit: 7.500 /μL (Normal)\n- Trombosit: 250.000 /μL (Normal)\n- Glukoz: 95 mg/dL (Normal)\n- Kreatinin: 0.9 mg/dL (Normal)\n\nSonuç: Tüm değerler normal sınırlar içerisindedir.",
        reportDate: new Date(),
        approvalStatus: "PENDING",
      },
      {
        reportType: "Röntgen",
        title: "Akciğer Röntgeni",
        content: "Hastanın akciğer röntgeni değerlendirmesi:\n\n- Akciğer alanları simetrik\n- Kalp gölgesi normal\n- Plevral efüzyon yok\n- Konsolidasyon yok\n\nSonuç: Normal akciğer görünümü.",
        reportDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 gün önce
        approvalStatus: "PENDING",
      },
      {
        reportType: "MR",
        title: "Beyin MR Görüntüleme",
        content: "Hastanın beyin MR görüntüleme sonuçları:\n\n- Beyin dokusu normal\n- Ventriküler sistem normal\n- Kitle lezyonu yok\n- İskemik değişiklik yok\n\nSonuç: Normal beyin MR görünümü.",
        reportDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 gün önce
        approvalStatus: "PENDING",
      },
    ];

    const createdReports = [];

    for (const reportData of testReports) {
      const report = await prisma.medicalReport.create({
        data: {
          doctorId: doctor.id,
          patientId: patient.id,
          reportType: reportData.reportType,
          title: reportData.title,
          content: reportData.content,
          reportDate: reportData.reportDate,
        },
      });

      createdReports.push(report);
    }

    console.log("✅ Test raporları başarıyla oluşturuldu!");
    console.log("\n📋 Oluşturulan Raporlar:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    createdReports.forEach((report, index) => {
      console.log(`\n${index + 1}. ${report.reportType} - ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Tarih: ${new Date(report.reportDate).toLocaleString("tr-TR")}`);
      console.log(`   Hasta: ${patient.name}`);
      console.log(`   Doktor: ${doctor.name}`);
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🔗 Doktor paneline giriş yapıp 'Bekleyen Raporlar' kartına tıklayarak raporları görebilirsiniz.");

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestReport();

