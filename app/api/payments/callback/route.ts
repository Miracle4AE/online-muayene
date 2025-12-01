import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, appointmentId } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token gerekli" },
        { status: 400 }
      );
    }

    // Ödemeyi doğrula
    const paymentResult = await verifyPayment(token);

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "Ödeme doğrulanamadı" },
        { status: 400 }
      );
    }

    // Randevuyu güncelle
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentStatus: "PAID",
          paymentDate: new Date(),
          paymentAmount: paymentResult.paidPrice || 0,
          status: "CONFIRMED", // Ödeme yapıldığında otomatik onayla
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: paymentResult.status,
      paidPrice: paymentResult.paidPrice,
    });
  } catch (error: any) {
    console.error("Payment callback error:", error);
    return NextResponse.json(
      { error: "Ödeme işlenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// GET metodu da destekle (İyzico callback GET ile gelebilir)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const token = searchParams.get("token");

  // Başarılı ödeme sayfasına yönlendir
  if (status === "success") {
    return NextResponse.redirect(new URL("/patient/dashboard?payment=success", request.url));
  }

  // Başarısız ödeme
  return NextResponse.redirect(new URL("/patient/dashboard?payment=failed", request.url));
}

