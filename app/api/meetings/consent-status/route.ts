import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
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
        patientId: userId,
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

