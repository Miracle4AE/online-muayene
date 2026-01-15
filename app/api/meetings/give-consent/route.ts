import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const giveConsentSchema = z.object({
  appointmentId: z.string().min(1, "Randevu ID gerekli"),
  patientId: z.string().min(1, "Hasta ID gerekli"),
  consentGiven: z.boolean(),
  consentIp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const validatedData = giveConsentSchema.parse(body);

    // Hasta kontrolü
    if (validatedData.patientId !== auth.userId) {
      return NextResponse.json(
        { error: "Bu işlem sadece kendi hesabınız için yapılabilir" },
        { status: 403 }
      );
    }

    // Randevu kontrolü
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
      include: {
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    if (appointment.patientId !== auth.userId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    // Video kaydını bul veya oluştur
    let recording = await prisma.videoRecording.findFirst({
      where: {
        appointmentId: validatedData.appointmentId,
        patientId: auth.userId,
      },
      orderBy: {
        recordingDate: "desc",
      },
    });

    if (recording) {
      // Mevcut kaydı güncelle
      recording = await prisma.videoRecording.update({
        where: { id: recording.id },
        data: {
          consentGiven: validatedData.consentGiven,
          consentDate: validatedData.consentGiven ? new Date() : null,
          consentIp: validatedData.consentIp || null,
        },
      });
    } else {
      // Yeni kayıt oluştur (görüşme henüz başlamamış olabilir)
      // Bu durumda sadece rıza kaydı oluşturulur
      recording = await prisma.videoRecording.create({
        data: {
          appointmentId: validatedData.appointmentId,
          doctorId: appointment.doctorId,
          patientId: auth.userId,
          videoUrl: "", // Görüşme başladığında güncellenecek
          consentGiven: validatedData.consentGiven,
          consentDate: validatedData.consentGiven ? new Date() : null,
          consentIp: validatedData.consentIp || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      recording,
      message: "Rıza başarıyla kaydedildi",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error giving consent:", error);
    return NextResponse.json(
      { error: error.message || "Rıza kaydedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

