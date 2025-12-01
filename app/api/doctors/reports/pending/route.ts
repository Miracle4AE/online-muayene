import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Header'dan user ID ve role'ü al (primary method)
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    // Fallback: getToken kullan
    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;

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

