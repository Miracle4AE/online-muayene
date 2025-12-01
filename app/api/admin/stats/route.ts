import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId } = await verifyAdminAccess(request);

    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Tarih filtreleri
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Toplam doktor sayısı
    const totalDoctors = await prisma.user.count({
      where: {
        role: "DOCTOR",
        hospitalId,
      },
    });

    // Onaylı doktor sayısı
    const approvedDoctors = await prisma.user.count({
      where: {
        role: "DOCTOR",
        hospitalId,
        doctorProfile: {
          verificationStatus: "APPROVED",
        },
      },
    });

    // Toplam hasta sayısı (bu hastanenin doktorlarıyla randevusu olan)
    const totalPatients = await prisma.user.count({
      where: {
        role: "PATIENT",
        patientAppointments: {
          some: {
            hospitalId,
          },
        },
      },
    });

    // Toplam randevu sayısı
    const totalAppointments = await prisma.appointment.count({
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Tamamlanan randevular
    const completedAppointments = await prisma.appointment.count({
      where: {
        hospitalId,
        status: "COMPLETED",
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Bekleyen randevular
    const pendingAppointments = await prisma.appointment.count({
      where: {
        hospitalId,
        status: "PENDING",
      },
    });

    // Toplam gelir (ödenen randevular)
    const paidAppointments = await prisma.appointment.findMany({
      where: {
        hospitalId,
        paymentStatus: "PAID",
        ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }),
      },
      select: {
        paymentAmount: true,
      },
    });

    const totalRevenue = paidAppointments.reduce(
      (sum, apt) => sum + (apt.paymentAmount || 0),
      0
    );

    // Reçete sayısı
    const totalPrescriptions = await prisma.prescription.count({
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Rapor sayısı
    const totalReports = await prisma.medicalReport.count({
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Görüntülü görüşme sayısı
    const totalRecordings = await prisma.videoRecording.count({
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Mesaj sayısı
    const totalMessages = await prisma.doctorMessage.count({
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
    });

    // Günlük randevu dağılımı (son 30 gün)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const appointmentsByDate = await prisma.appointment.groupBy({
      by: ["appointmentDate"],
      where: {
        hospitalId,
        appointmentDate: {
          gte: thirtyDaysAgo,
        },
      },
      _count: true,
    });

    // Doktor başına randevu sayısı (top 10)
    const appointmentsByDoctor = await prisma.appointment.groupBy({
      by: ["doctorId"],
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      _count: true,
      orderBy: {
        _count: {
          doctorId: "desc",
        },
      },
      take: 10,
    });

    // Doktor bilgilerini ekle
    const topDoctors = await Promise.all(
      appointmentsByDoctor.map(async (item) => {
        const doctor = await prisma.user.findUnique({
          where: { id: item.doctorId },
          include: { doctorProfile: true },
        });
        return {
          doctorId: item.doctorId,
          doctorName: doctor?.name || "Bilinmiyor",
          specialization: doctor?.doctorProfile?.specialization || "Belirtilmemiş",
          appointmentCount: item._count,
        };
      })
    );

    return NextResponse.json({
      summary: {
        totalDoctors,
        approvedDoctors,
        totalPatients,
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        totalRevenue,
        totalPrescriptions,
        totalReports,
        totalRecordings,
        totalMessages,
      },
      charts: {
        appointmentsByDate: appointmentsByDate.map((item) => ({
          date: item.appointmentDate,
          count: item._count,
        })),
        topDoctors,
      },
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

