import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const saveRecordingSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
  recordingFileUrl: z.string().url("Geçerli bir URL gerekli"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = saveRecordingSchema.parse(body);

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

    // Son video kaydını bul ve güncelle
    const lastRecording = appointment.videoRecordings[0];
    if (lastRecording) {
      await prisma.videoRecording.update({
        where: { id: lastRecording.id },
        data: {
          recordingFileUrl: validatedData.recordingFileUrl,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Kayıt dosyası kaydedildi",
      });
    }

    return NextResponse.json(
      { error: "Video kaydı bulunamadı" },
      { status: 404 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error saving recording:", error);
    return NextResponse.json(
      { error: error.message || "Kayıt dosyası kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

