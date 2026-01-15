import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const doctorId = auth.userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Hesabınız henüz onaylanmamış" },
        { status: 403 }
      );
    }

    // Bekleyen raporları getir (PENDING veya NULL durumundaki raporlar)
    // Tüm raporları çekip JavaScript'te filtrele (SQLite NULL kontrolü sorunlu)
    const allReports = await prisma.medicalReport.findMany({
      where: {
        doctorId: doctorId,
      },
      include: {
        patient: {
          include: {
            patientProfile: {
              select: {
                id: true,
                tcKimlikNo: true,
              },
            },
          },
        },
      },
      orderBy: {
        reportDate: "desc",
      },
    });

    // PENDING veya NULL olanları filtrele
    const reports = allReports.filter(r => !r.approvalStatus || r.approvalStatus === "PENDING");

    // Raporları formatla
    const formattedReports = reports.map((report) => {
      return {
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        content: report.content,
        reportDate: report.reportDate,
        fileUrl: report.fileUrl,
        patient: {
          id: report.patient.id,
          name: report.patient.name,
          email: report.patient.email,
          tcKimlikNo: report.patient.patientProfile?.tcKimlikNo,
        },
      };
    });

    return NextResponse.json({
      reports: formattedReports,
    });
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    return NextResponse.json(
      { error: "Bekleyen raporlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

