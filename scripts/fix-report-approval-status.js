const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixReportApprovalStatus() {
  try {
    // Önce tüm raporları çek
    const allReports = await prisma.medicalReport.findMany({
      select: {
        id: true,
        approvalStatus: true,
      },
    });

    console.log(`📋 Toplam ${allReports.length} rapor bulundu`);

    // approvalStatus NULL veya boş olanları bul
    const reportsToFix = allReports.filter(r => !r.approvalStatus || r.approvalStatus === null);

    console.log(`📋 ${reportsToFix.length} rapor bulundu (approvalStatus NULL/boş)`);

    if (reportsToFix.length === 0) {
      console.log("✅ Tüm raporlar zaten approvalStatus'a sahip!");
    } else {
      // Her bir raporu tek tek güncelle (SQLite için güvenli)
      let updatedCount = 0;
      for (const report of reportsToFix) {
        try {
          await prisma.medicalReport.update({
            where: { id: report.id },
            data: { approvalStatus: "PENDING" },
          });
          updatedCount++;
        } catch (err) {
          console.error(`❌ Rapor güncellenemedi (ID: ${report.id}):`, err.message);
        }
      }

      console.log(`✅ ${updatedCount} rapor güncellendi (approvalStatus = PENDING)`);
    }

    // Şimdi tüm raporları tekrar çek ve durumları göster
    const finalReports = await prisma.medicalReport.findMany({
      select: {
        id: true,
        title: true,
        approvalStatus: true,
        doctorId: true,
      },
    });

    console.log("\n📊 Rapor Durumları:");
    const statusCounts = finalReports.reduce((acc, report) => {
      const status = report.approvalStatus || "NULL";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

  } catch (error) {
    console.error("❌ Hata oluştu:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixReportApprovalStatus();

