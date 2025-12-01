import { NextRequest, NextResponse } from "next/server";
import { initializePayment } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointmentId, userId } = body;

    if (!appointmentId || !userId) {
      return NextResponse.json(
        { error: "Randevu ID ve kullanıcı ID gerekli" },
        { status: 400 }
      );
    }

    // Randevuyu bul
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          include: {
            doctorProfile: true,
          },
        },
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    if (appointment.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Bu randevu için ödeme zaten yapılmış" },
        { status: 400 }
      );
    }

    const amount = appointment.paymentAmount || appointment.doctor.doctorProfile?.appointmentPrice || 0;

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Ödeme tutarı bulunamadı" },
        { status: 400 }
      );
    }

    // Ödeme verilerini hazırla
    const paymentData = {
      price: amount,
      paidPrice: amount,
      basketId: appointmentId,
      buyer: {
        id: appointment.patient.id,
        name: appointment.patient.name.split(" ")[0] || "Hasta",
        surname: appointment.patient.name.split(" ").slice(1).join(" ") || "Kullanıcı",
        email: appointment.patient.email,
        phone: appointment.patient.phone || "05551234567",
        identityNumber: appointment.patient.patientProfile?.tcKimlikNo || "11111111111",
        registrationAddress: appointment.patient.patientProfile?.address || "Adres bilgisi yok",
        city: "Bursa",
        country: "Türkiye",
      },
      shippingAddress: {
        contactName: appointment.patient.name,
        city: "Bursa",
        country: "Türkiye",
        address: appointment.patient.patientProfile?.address || "Adres bilgisi yok",
      },
      basketItems: [
        {
          id: appointmentId,
          name: `Online Muayene - ${appointment.doctor.name}`,
          category: "Sağlık Hizmetleri",
          price: amount,
        },
      ],
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/payments/callback`,
    };

    const result = await initializePayment(paymentData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Ödeme başlatılamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentPageUrl: result.paymentPageUrl,
      token: result.token,
    });
  } catch (error: any) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Ödeme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

