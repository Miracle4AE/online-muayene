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

    // Hastayı engelle (tüm mesajlarını BLOCKED yap)
    await prisma.doctorMessage.updateMany({
      where: {
        patientId: message.patientId,
        doctorId: doctorId,
        status: {
          in: ["PENDING", "ACTIVE"],
        },
      },
      data: {
        status: "BLOCKED",
        blockedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      info: "Hasta engellendi. Artık size mesaj gönderemez.",
    });
  } catch (error: any) {
    console.error("Error blocking patient:", error);
    return NextResponse.json(
      { error: error?.message || "Hasta engellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

