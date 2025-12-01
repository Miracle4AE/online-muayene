import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";

// Raporları listele (hastane bazlı)
export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const doctorId = request.nextUrl.searchParams.get("doctorId");
    const patientId = request.nextUrl.searchParams.get("patientId");
    const reportType = request.nextUrl.searchParams.get("reportType");
    const reportId = request.nextUrl.searchParams.get("reportId");
    const doctorName = request.nextUrl.searchParams.get("doctorName");
    const patientTcKimlikNo = request.nextUrl.searchParams.get("patientTcKimlikNo");
    const patientName = request.nextUrl.searchParams.get("patientName");

    const where: any = {
      hospitalId: hospitalId, // Sadece bu hastanenin raporları
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (reportType) {
      where.reportType = reportType;
    }

    if (reportId) {
      where.id = reportId;
    }

    // Doktor adı ile arama
    if (doctorName) {
      where.doctor = {
        ...where.doctor,
        name: {
          contains: doctorName,
          mode: "insensitive",
        },
      };
    }

    // Hasta T.C. Kimlik No ile arama
    if (patientTcKimlikNo) {
      where.patient = {
        patientProfile: {
          tcKimlikNo: patientTcKimlikNo,
        },
      };
    }

    // Hasta adı/soyadı ile arama
    if (patientName) {
      where.patient = {
        ...where.patient,
        name: {
          contains: patientName,
          mode: "insensitive",
        },
      };
    }

    const reports = await prisma.medicalReport.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            patientProfile: {
              select: {
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

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Raporlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

