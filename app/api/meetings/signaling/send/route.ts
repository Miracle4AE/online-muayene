import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sendSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
  type: z.enum(["offer", "answer", "ice", "chat", "prescription", "document"]),
  payload: z.any(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validated = sendSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: validated.appointmentId },
      select: { doctorId: true, patientId: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    if (appointment.doctorId !== auth.userId && appointment.patientId !== auth.userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const signal = await prisma.meetingSignal.create({
      data: {
        appointmentId: validated.appointmentId,
        senderId: auth.userId,
        type: validated.type,
        payload: validated.payload,
      },
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, signal });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Signaling send error:", error);
    return NextResponse.json(
      { error: error.message || "Sinyal gönderilemedi" },
      { status: 500 }
    );
  }
}
