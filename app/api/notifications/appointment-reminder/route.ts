import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS, smsTemplates } from "@/lib/sms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${secret}`) {
        return NextResponse.json(
          { error: "Yetkisiz erişim" },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        reminderSentAt: null,
        appointmentDate: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    for (const appointment of appointments) {
      if (!appointment.patient?.phone) continue;
      const time = new Date(appointment.appointmentDate).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const message = smsTemplates.appointmentReminder15Min({
        patientName: appointment.patient.name,
        doctorName: appointment.doctor.name,
        time,
      });
      await sendSMS(appointment.patient.phone, message);

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, count: appointments.length });
  } catch (error: any) {
    console.error("Appointment reminder error:", error);
    return NextResponse.json(
      { error: error.message || "Randevu hatırlatma gönderilemedi" },
      { status: 500 }
    );
  }
}
