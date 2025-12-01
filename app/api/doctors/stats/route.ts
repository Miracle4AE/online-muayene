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

    // Bugünün başlangıcı ve sonu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("📅 Bugün:", today.toISOString());
    console.log("📅 Yarın:", tomorrow.toISOString());

    // Bu haftanın başlangıcı (Pazartesi)
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Pazartesi
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // Bu haftanın sonu (Pazar)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    console.log("📅 Hafta Başlangıcı:", weekStart.toISOString());
    console.log("📅 Hafta Sonu:", weekEnd.toISOString());
    console.log("👨‍⚕️ Doktor ID:", doctorId);

    // Bugünkü randevular
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        appointmentDate: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    console.log("📅 Bugünkü Randevular:", todayAppointments.length);

    const todayCompleted = todayAppointments.filter(a => a.status === "COMPLETED").length;
    const todayPending = todayAppointments.filter(a => a.status === "PENDING" || a.status === "CONFIRMED").length;

    // Bu haftaki randevular
    const weeklyAppointments = await prisma.appointment.count({
      where: {
        doctorId: doctorId,
        appointmentDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
    });

    console.log("📅 Bu Haftaki Randevular:", weeklyAppointments);

    // Toplam hasta sayısı (unique patients)
    const totalPatients = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
      },
      select: {
        patientId: true,
      },
      distinct: ["patientId"],
    });

    console.log("👥 Toplam Hasta:", totalPatients.length);

    // Bekleyen raporlar (MedicalReport - onay bekleyen)
    // approvalStatus alanı yeni eklendi, güvenli kontrol yap
    let pendingReports = 0;
    try {
      const allReports = await prisma.medicalReport.findMany({
        where: {
          doctorId: doctorId,
        },
      });
      
      // approvalStatus alanını güvenli şekilde kontrol et
      pendingReports = allReports.filter((r: any) => {
        const status = r.approvalStatus;
        // NULL, undefined veya PENDING olanları say
        return status === null || status === undefined || status === "PENDING" || !status;
      }).length;
      
      console.log("📋 Bekleyen Raporlar:", pendingReports);
    } catch (reportError: any) {
      console.error("Rapor hatası:", reportError);
      // Hata durumunda 0 döndür
      pendingReports = 0;
    }

    return NextResponse.json({
      todayAppointments: todayAppointments.length,
      todayCompleted,
      todayPending,
      weeklyAppointments,
      totalPatients: totalPatients.length,
      pendingReports,
    });

  } catch (error: any) {
    console.error("Error fetching doctor stats:", error);
    console.error("Error details:", error.message, error.stack);
    return NextResponse.json(
      { error: "İstatistikler alınırken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

