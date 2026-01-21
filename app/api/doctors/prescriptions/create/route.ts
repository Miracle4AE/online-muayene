import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const createPrescriptionSchema = z.object({
  appointmentId: z.string().min(1, "Randevu seçilmelidir"),
  patientId: z.string().min(1, "Hasta seçilmelidir"),
  prescriptionNumber: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  medications: z.string().min(1, "İlaçlar belirtilmelidir"),
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
        prescriptionNumber: validatedData.prescriptionNumber || null,
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

