import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doktor seçilmelidir"),
  appointmentDate: z.string().min(1, "Tarih ve saat seçilmelidir"),
  notes: z.string().optional().nullable(),
  paymentAmount: z.number().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  consentGiven: z.boolean().optional().nullable(),
  consentIp: z.string().optional().nullable(),
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
        { error: "Yetkisiz erişim. Lütfen hasta olarak giriş yapın." },
        { status: 403 }
      );
    }

    const patientId = userId;

    // Hasta kontrolü
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
      },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createAppointmentSchema.parse(body);

    // Doktor kontrolü
    const doctor = await prisma.user.findUnique({
      where: { id: validatedData.doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Bu doktor henüz onaylanmamış" },
        { status: 400 }
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
        doctorId: validatedData.doctorId,
        appointmentDate: appointmentDate,
        status: {
          notIn: ["CANCELLED", "COMPLETED"],
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: "Bu saatte zaten bir randevu mevcut. Lütfen başka bir saat seçin." },
        { status: 400 }
      );
    }

    // Meeting link oluştur (Jitsi Meet formatında)
    const meetingId = `appointment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const meetingLink = `https://meet.jit.si/${meetingId}`;

    // Doktor ücretini al
    const appointmentPrice = doctor.doctorProfile?.appointmentPrice || 0;
    const paymentAmount = validatedData.paymentAmount || appointmentPrice;

    // Randevuyu oluştur
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: validatedData.doctorId,
        patientId: patientId,
        hospitalId: doctor.hospitalId, // Doktorun hastane ID'si
        appointmentDate: appointmentDate,
        status: "PENDING", // Hasta tarafından oluşturulduğu için PENDING (doktor onaylayacak)
        notes: validatedData.notes || null,
        meetingLink: meetingLink,
        // Ödeme bilgileri
        paymentAmount: paymentAmount > 0 ? paymentAmount : null,
        paymentDate: paymentAmount > 0 ? new Date() : null,
        paymentStatus: paymentAmount > 0 ? "PAID" : "PENDING",
        paymentMethod: validatedData.paymentMethod || (paymentAmount > 0 ? "CREDIT_CARD" : null),
      },
    });

    // Rıza bilgisini kaydet (eğer verildiyse)
    if (validatedData.consentGiven && appointment.id) {
      try {
        await prisma.videoRecording.create({
          data: {
            appointmentId: appointment.id,
            doctorId: validatedData.doctorId,
            patientId: patientId,
            hospitalId: doctor.hospitalId, // Doktorun hastane ID'si
            videoUrl: meetingLink,
            consentGiven: true,
            consentDate: new Date(),
            consentIp: validatedData.consentIp || null,
            recordingDate: new Date(),
          },
        });
      } catch (error) {
        console.error("Rıza bilgisi kaydedilemedi:", error);
        // Rıza kaydedilemese bile randevu oluşturuldu
      }
    }

    // Randevuyu tekrar getir
    const appointmentWithRelations = await prisma.appointment.findUnique({
      where: { id: appointment.id },
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
      appointment: appointmentWithRelations,
      message: "Randevu başarıyla oluşturuldu. Doktor onayı bekleniyor.",
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

