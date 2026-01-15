import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication kontrolü
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const doctorId = auth.userId;
    const messageId = params.id;

    // Mesajı bul ve kontrol et
    const message = await prisma.doctorMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Mesaj bulunamadı" },
        { status: 404 }
      );
    }

    if (message.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu mesaj size ait değil" },
        { status: 403 }
      );
    }

    if (message.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif görüşmeler kapatılabilir" },
        { status: 400 }
      );
    }

    // Görüşmeyi kapat
    const updatedMessage = await prisma.doctorMessage.update({
      where: { id: messageId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
      info: "Görüşme kapatıldı. Hasta artık size yazamaz.",
    });
  } catch (error: any) {
    console.error("Error closing conversation:", error);
    return NextResponse.json(
      { error: error?.message || "Görüşme kapatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

