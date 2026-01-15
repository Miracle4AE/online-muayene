import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const appointmentId = request.nextUrl.searchParams.get("appointmentId");
    if (!appointmentId) {
      return NextResponse.json(
        { error: "Randevu ID gerekli" },
        { status: 400 }
      );
    }

    // Video kaydını bul
    const recording = await prisma.videoRecording.findFirst({
      where: {
        appointmentId: appointmentId,
        patientId: auth.userId,
      },
      orderBy: {
        recordingDate: "desc",
      },
    });

    return NextResponse.json({
      consentGiven: recording?.consentGiven || false,
      recordingId: recording?.id || null,
    });
  } catch (error: any) {
    console.error("Error checking consent status:", error);
    return NextResponse.json(
      { error: "Rıza durumu kontrol edilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

