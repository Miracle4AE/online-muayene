import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

const createPrescriptionSchema = z.object({
  appointmentId: z.string().min(1, "Randevu seçilmelidir"),
  patientId: z.string().min(1, "Hasta seçilmelidir"),
  diagnosis: z.string().optional().nullable(),
  medications: z.string().min(1, "İlaçlar belirtilmelidir"),
  notes: z.string().optional().nullable(),
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
    const validatedData = createPrescriptionSchema.parse(body);

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

    // Randevunun bu hastaya ait olduğunu kontrol et
    if (appointment.patientId !== validatedData.patientId) {
      return NextResponse.json(
        { error: "Randevu bu hastaya ait değil" },
        { status: 400 }
      );
    }

    // Randevu durumu kontrolü (CONFIRMED veya COMPLETED olmalı)
    if (appointment.status !== "CONFIRMED" && appointment.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Sadece onaylanmış veya tamamlanmış randevular için reçete yazılabilir" },
        { status: 400 }
      );
    }

    // Reçeteyi oluştur
    const prescription = await prisma.prescription.create({
      data: {
        appointmentId: validatedData.appointmentId,
        doctorId: doctorId,
        patientId: validatedData.patientId,
        diagnosis: validatedData.diagnosis || null,
        medications: validatedData.medications,
        notes: validatedData.notes || null,
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        doctor: {
          select: {
            name: true,
            email: true,
          },
        },
        appointment: {
          select: {
            appointmentDate: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      prescription,
      message: "Reçete başarıyla oluşturuldu",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { error: error.message || "Reçete oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

