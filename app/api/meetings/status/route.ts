import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statusSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const appointmentId = request.nextUrl.searchParams.get("appointmentId");
    const validated = statusSchema.parse({ appointmentId });

    const appointment = await prisma.appointment.findUnique({
      where: { id: validated.appointmentId },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        meetingLink: true,
        meetingStartedAt: true,
        meetingEndsAt: true,
        meetingAutoEndDisabled: true,
        meetingEndedAt: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    if (appointment.doctorId !== auth.userId && appointment.patientId !== auth.userId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      meetingLink: appointment.meetingLink,
      meetingStartedAt: appointment.meetingStartedAt,
      meetingEndsAt: appointment.meetingEndsAt,
      meetingAutoEndDisabled: appointment.meetingAutoEndDisabled,
      meetingEndedAt: appointment.meetingEndedAt,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error fetching meeting status:", error);
    return NextResponse.json(
      { error: error.message || "Görüşme durumu alınırken hata oluştu" },
      { status: 500 }
    );
  }
}
