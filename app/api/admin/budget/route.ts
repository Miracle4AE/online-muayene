import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Admin authentication kontrolü
    const adminToken = request.cookies.get("admin_token");
    
    if (!adminToken) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Admin bilgilerini al
    const adminInfoResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/info`,
      {
        headers: {
          Cookie: `admin_token=${adminToken.value}`,
        },
      }
    );

    if (!adminInfoResponse.ok) {
      return NextResponse.json(
        { error: "Admin bilgileri alınamadı" },
        { status: 401 }
      );
    }

    const adminInfo = await adminInfoResponse.json();
    const hospital = adminInfo.hospital;

    // Query parametrelerini al
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Tarih filtreleri
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
      // End date'in son saatini ekle (23:59:59)
      dateFilter.lte.setHours(23, 59, 59, 999);
    }

    // Randevuları getir (hastane bazlı, ödeme yapılmış olanlar)
    const whereClause: any = {
      doctor: {
        doctorProfile: {
          hospital: hospital,
        },
      },
      paymentStatus: "PAID", // Sadece ödenmiş randevular
      paymentAmount: {
        not: null,
      },
    };

    // Doktor filtresi
    if (doctorId) {
      whereClause.doctorId = doctorId;
    }

    // Tarih filtresi
    if (Object.keys(dateFilter).length > 0) {
      whereClause.paymentDate = dateFilter;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
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
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Toplam gelir hesapla
    const totalRevenue = appointments.reduce((sum, apt) => {
      return sum + (apt.paymentAmount || 0);
    }, 0);

    // Doktor bazlı gelir hesapla
    const revenueByDoctor: Record<string, {
      doctorId: string;
      doctorName: string;
      doctorEmail: string;
      specialization: string | null;
      revenue: number;
      appointmentCount: number;
    }> = {};

    appointments.forEach((apt) => {
      const doctorId = apt.doctorId;
      if (!revenueByDoctor[doctorId]) {
        revenueByDoctor[doctorId] = {
          doctorId: apt.doctor.id,
          doctorName: apt.doctor.name,
          doctorEmail: apt.doctor.email,
          specialization: apt.doctor.doctorProfile?.specialization || null,
          revenue: 0,
          appointmentCount: 0,
        };
      }
      revenueByDoctor[doctorId].revenue += apt.paymentAmount || 0;
      revenueByDoctor[doctorId].appointmentCount += 1;
    });

    // Doktor bazlı gelirleri array'e çevir ve sırala
    const revenueByDoctorArray = Object.values(revenueByDoctor).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Tarih bazlı gelir (günlük)
    const revenueByDate: Record<string, number> = {};
    appointments.forEach((apt) => {
      if (apt.paymentDate) {
        const dateKey = apt.paymentDate.toISOString().split("T")[0];
        if (!revenueByDate[dateKey]) {
          revenueByDate[dateKey] = 0;
        }
        revenueByDate[dateKey] += apt.paymentAmount || 0;
      }
    });

    // Tarih bazlı gelirleri array'e çevir ve sırala
    const revenueByDateArray = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalAppointments: appointments.length,
        revenueByDoctor: revenueByDoctorArray,
        revenueByDate: revenueByDateArray,
        appointments: appointments.map((apt) => ({
          id: apt.id,
          doctorId: apt.doctorId,
          doctorName: apt.doctor.name,
          doctorEmail: apt.doctor.email,
          specialization: apt.doctor.doctorProfile?.specialization || null,
          patientId: apt.patientId,
          patientName: apt.patient.name,
          patientEmail: apt.patient.email,
          appointmentDate: apt.appointmentDate,
          paymentAmount: apt.paymentAmount,
          paymentDate: apt.paymentDate,
          paymentMethod: apt.paymentMethod,
          paymentStatus: apt.paymentStatus,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching budget data:", error);
    return NextResponse.json(
      { error: error.message || "Bütçe verileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

