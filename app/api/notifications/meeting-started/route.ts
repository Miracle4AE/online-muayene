import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { sendSMS, smsTemplates } from "@/lib/sms";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientEmail,
      patientPhone,
      patientName,
      doctorName,
      meetingLink,
      appointmentDate,
    } = body;

    if (!patientEmail || !meetingLink) {
      return NextResponse.json(
        { error: "Eksik bilgi" },
        { status: 400 }
      );
    }

    // Tarih formatla
    const date = new Date(appointmentDate);
    const formattedDate = date.toLocaleDateString("tr-TR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Email içeriği (profesyonel şablon kullan)
    const emailSubject = `Online Görüşme Başlatıldı - ${formattedDate} ${formattedTime}`;
    const emailHtml = emailTemplates.meetingStarted({
      patientName,
      doctorName,
      date: formattedDate,
      time: formattedTime,
      meetingLink,
    });

    // SMS içeriği (template kullan)
    const smsMessage = smsTemplates.meetingStarted({
      patientName,
      doctorName,
      meetingLink,
    });

    // Email ve SMS gönder
    const emailResult = await sendEmail(patientEmail, emailSubject, emailHtml);
    const smsResult = patientPhone ? await sendSMS(patientPhone, smsMessage) : true;

    return NextResponse.json({
      success: true,
      emailSent: emailResult,
      smsSent: smsResult,
      message: "Bildirimler gönderildi",
    });
  } catch (error: any) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { error: "Bildirim gönderilirken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

