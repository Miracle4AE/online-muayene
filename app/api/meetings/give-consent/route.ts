import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
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
    // Header'dan user ID ve role'ü al
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    // Fallback: getToken kullan
    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = giveConsentSchema.parse(body);

    // Hasta kontrolü
    if (validatedData.patientId !== userId) {
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

    if (appointment.patientId !== userId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    // Video kaydını bul veya oluştur
    let recording = await prisma.videoRecording.findFirst({
      where: {
        appointmentId: validatedData.appointmentId,
        patientId: userId,
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
          patientId: userId,
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

