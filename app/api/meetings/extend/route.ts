import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const extendSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const validated = extendSchema.parse(body);

    const appointment = await prisma.appointment.findUnique({
      where: { id: validated.appointmentId },
      select: {
        id: true,
        doctorId: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    if (appointment.doctorId !== auth.userId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    await prisma.appointment.update({
      where: { id: validated.appointmentId },
      data: {
        meetingAutoEndDisabled: true,
        meetingEndsAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Görüşme süresi uzatıldı",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error extending meeting:", error);
    return NextResponse.json(
      { error: error.message || "Görüşme uzatılırken hata oluştu" },
      { status: 500 }
    );
  }
}
