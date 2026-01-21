import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pollSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
  after: z.number().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const appointmentId = request.nextUrl.searchParams.get("appointmentId") || "";
    const afterParam = request.nextUrl.searchParams.get("after");
    const after = afterParam ? Number(afterParam) : undefined;

    const validated = pollSchema.parse({ appointmentId, after });

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

    const afterDate = validated.after ? new Date(validated.after) : new Date(0);

    const signals = await prisma.meetingSignal.findMany({
      where: {
        appointmentId: validated.appointmentId,
        senderId: { not: auth.userId },
        createdAt: { gt: afterDate },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ signals });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Signaling poll error:", error);
    return NextResponse.json(
      { error: error.message || "Sinyaller alınamadı" },
      { status: 500 }
    );
  }
}
