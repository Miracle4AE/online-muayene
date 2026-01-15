import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Hasta seçilmelidir"),
  appointmentDate: z.string().min(1, "Tarih ve saat seçilmelidir"),
  notes: z.string().optional().nullable(),
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

    const doctorId = auth.userId;

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
    const validatedData = createAppointmentSchema.parse(body);

    // Hasta kontrolü
    const patient = await prisma.user.findUnique({
      where: { id: validatedData.patientId },
      include: {
        patientProfile: true,
      },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Hasta bulunamadı" },
        { status: 404 }
      );
    }

    // Tarih kontrolü - geçmiş tarih olamaz
    const appointmentDate = new Date(validatedData.appointmentDate);
    const now = new Date();
    now.setSeconds(0, 0); // Saniye ve milisaniyeleri sıfırla
    if (appointmentDate < now) {
      return NextResponse.json(
        { error: "Geçmiş bir tarih seçilemez" },
        { status: 400 }
      );
    }

    // Aynı saatte başka randevu var mı kontrol et
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorId,
        appointmentDate: appointmentDate,
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "Bu saatte zaten bir randevu mevcut" },
        { status: 400 }
      );
    }

    // Meeting link oluştur (Jitsi Meet formatında)
    const meetingId = `appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const meetingLink = `https://meet.jit.si/${meetingId}`;

    // Randevuyu oluştur
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctorId,
        patientId: validatedData.patientId,
        appointmentDate: appointmentDate,
        status: "CONFIRMED", // Doktor tarafından oluşturulduğu için direkt CONFIRMED
        notes: validatedData.notes || null,
        meetingLink: meetingLink,
      },
      include: {
        doctor: {
          select: {
            name: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
                hospital: true,
              },
            },
          },
        },
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Email ve SMS bildirimi gönder (asenkron)
    try {
      const notificationResponse = await fetch(`${request.nextUrl.origin}/api/notifications/appointment-created`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          patientEmail: patient.email,
          patientPhone: patient.phone,
          patientName: patient.name,
          doctorName: doctor.name,
          doctorSpecialization: doctor.doctorProfile?.specialization,
          hospital: doctor.doctorProfile?.hospital,
          appointmentDate: appointment.appointmentDate,
        }),
      });

      if (!notificationResponse.ok) {
        console.error("Bildirim gönderilemedi:", await notificationResponse.text());
      }
    } catch (notificationError) {
      console.error("Bildirim hatası:", notificationError);
      // Bildirim hatası olsa bile randevu oluşturuldu
    }

    return NextResponse.json({
      success: true,
      appointment,
      message: "Randevu başarıyla oluşturuldu. Hastaya bildirim gönderildi.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Randevu oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

