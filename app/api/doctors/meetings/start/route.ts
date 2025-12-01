import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startMeetingSchema = z.object({
  appointmentId: z.string().min(1, "Randevu seçilmelidir"),
  meetingLink: z.string().url("Geçerli bir görüşme linki giriniz"),
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

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Hesabınız henüz onaylanmamış" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = startMeetingSchema.parse(body);

    // Randevu kontrolü
    const appointment = await prisma.appointment.findUnique({
      where: { id: validatedData.appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    // Randevunun bu doktora ait olduğunu kontrol et
    if (appointment.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    // Randevu durumu kontrolü
    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Sadece onaylanmış randevular için görüşme başlatılabilir" },
        { status: 400 }
      );
    }

    // Randevu saatini kontrol et
    const now = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);
    const appointmentEndTime = new Date(appointmentDate);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + 15); // 15 dakika

    if (now < appointmentDate) {
      return NextResponse.json(
        { error: "Randevu saati henüz gelmedi" },
        { status: 400 }
      );
    }

    if (now > appointmentEndTime) {
      return NextResponse.json(
        { error: "Randevu süresi dolmuş" },
        { status: 400 }
      );
    }

    // Randevuya görüşme linkini ekle
    const updatedAppointment = await prisma.appointment.update({
      where: { id: validatedData.appointmentId },
      data: {
        meetingLink: validatedData.meetingLink,
        status: "COMPLETED", // Görüşme başladığında tamamlandı olarak işaretle
      },
    });

    // Video kaydını bul veya oluştur (rıza verilmişse güncelle)
    let videoRecording = await prisma.videoRecording.findFirst({
      where: {
        appointmentId: validatedData.appointmentId,
        patientId: appointment.patientId,
      },
      orderBy: {
        recordingDate: "desc",
      },
    });

    if (videoRecording) {
      // Mevcut kaydı güncelle (rıza verilmişse)
      videoRecording = await prisma.videoRecording.update({
        where: { id: videoRecording.id },
        data: {
          videoUrl: validatedData.meetingLink,
          recordingDate: new Date(), // Görüşme başlangıç zamanı
        },
      });
    } else {
      // Yeni kayıt oluştur
      videoRecording = await prisma.videoRecording.create({
        data: {
          appointmentId: validatedData.appointmentId,
          doctorId: doctorId,
          patientId: appointment.patientId,
          videoUrl: validatedData.meetingLink,
          duration: null, // Görüşme bitince güncellenecek
          notes: null,
          consentGiven: false, // Hasta henüz rıza vermemiş olabilir
        },
      });
    }

    // Hastaya görüşme linki bildirimi gönder (asenkron)
    try {
      const notificationResponse = await fetch(`${request.nextUrl.origin}/api/notifications/meeting-started`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientEmail: appointment.patient.email,
          patientPhone: appointment.patient.phone,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          meetingLink: validatedData.meetingLink,
          appointmentDate: appointment.appointmentDate,
        }),
      });

      if (!notificationResponse.ok) {
        console.error("Bildirim gönderilemedi:", await notificationResponse.text());
      }
    } catch (notificationError) {
      console.error("Bildirim hatası:", notificationError);
      // Bildirim hatası olsa bile görüşme başlatıldı
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      videoRecording,
      message: "Görüşme başlatıldı",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error starting meeting:", error);
    return NextResponse.json(
      { error: error.message || "Görüşme başlatılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

