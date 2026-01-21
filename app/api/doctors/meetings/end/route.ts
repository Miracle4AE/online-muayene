import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const endMeetingSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
  meetingId: z.string().optional(),
  duration: z.number().optional(), // saniye cinsinden
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
    const validatedData = endMeetingSchema.parse(body);

    // Randevuyu bul
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
      include: {
        videoRecordings: {
          orderBy: {
            recordingDate: "desc",
          },
          take: 1,
        },
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

    // Son video kaydını bul ve güncelle
    const lastRecording = appointment.videoRecordings[0];
    if (lastRecording) {
      // Görüşme başlangıcından şu ana kadar geçen süreyi hesapla
      const startTime = new Date(lastRecording.recordingDate);
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // saniye

      await prisma.videoRecording.update({
        where: { id: lastRecording.id },
        data: {
          duration: duration,
        },
      });

      await prisma.appointment.update({
        where: { id: validatedData.appointmentId },
        data: {
          status: "COMPLETED",
          meetingEndedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        duration,
        message: "Görüşme süresi kaydedildi",
      });
    }

    await prisma.appointment.update({
      where: { id: validatedData.appointmentId },
      data: {
        status: "COMPLETED",
        meetingEndedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Görüşme sonlandı",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error ending meeting:", error);
    return NextResponse.json(
      { error: error.message || "Görüşme sonlandırılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

