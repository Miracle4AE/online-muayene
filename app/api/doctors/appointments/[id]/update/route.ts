import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id;

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
      include: { doctorProfile: true },
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
    const action = body.action as "CANCEL" | "RESCHEDULE";
    const newDate = body.appointmentDate as string | undefined;

    if (!action) {
      return NextResponse.json(
        { error: "Geçersiz işlem" },
        { status: 400 }
      );
    }

    // Randevu kontrolü
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    if (appointment.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Tamamlanmış veya iptal edilmiş randevu güncellenemez" },
        { status: 400 }
      );
    }

    if (action === "CANCEL") {
      const updated = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({ appointment: updated });
    }

    // RESCHEDULE
    if (!newDate) {
      return NextResponse.json(
        { error: "Yeni tarih saat gereklidir" },
        { status: 400 }
      );
    }

    const newDateObj = new Date(newDate);
    const now = new Date();
    if (isNaN(newDateObj.getTime()) || newDateObj < now) {
      return NextResponse.json(
        { error: "Geçmiş veya geçersiz tarih" },
        { status: 400 }
      );
    }

    // Çakışma kontrolü
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        id: { not: appointmentId },
        appointmentDate: newDateObj,
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Bu saatte başka bir randevu mevcut" },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        appointmentDate: newDateObj,
        status: "CONFIRMED",
      },
    });

    return NextResponse.json({ appointment: updated });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Randevu güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

