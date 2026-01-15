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

    if (message.status !== "PENDING") {
      return NextResponse.json(
        { error: "Bu mesaj zaten işlenmiş" },
        { status: 400 }
      );
    }

    // Görüşmeyi başlat
    const updatedMessage = await prisma.doctorMessage.update({
      where: { id: messageId },
      data: {
        status: "ACTIVE",
        startedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
      info: "Görüşme başlatıldı. Hasta artık size yazabilir.",
    });
  } catch (error: any) {
    console.error("Error starting conversation:", error);
    return NextResponse.json(
      { error: error?.message || "Görüşme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

