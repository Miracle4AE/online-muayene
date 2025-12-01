import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Header'dan user ID ve role'ü al (primary method)
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
    const reportId = params.id;

    // Request body'den red sebebini ve doktor notlarını al
    const body = await request.json();
    const rejectionReason = body.rejectionReason || "";
    const doctorNotes = body.doctorNotes || "";
    const updatedContent = body.content || null; // Doktor içeriği düzenleyebilir

    if (!rejectionReason.trim()) {
      return NextResponse.json(
        { error: "Red sebebi gereklidir" },
        { status: 400 }
      );
    }

    // Raporu bul
    const report = await prisma.medicalReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Rapor bulunamadı" },
        { status: 404 }
      );
    }

    // Raporun bu doktora ait olduğunu kontrol et
    if (report.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu raporu reddetme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Raporu reddet ve doktor notlarını ekle
    const updatedReport = await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: rejectionReason.trim(),
        doctorNotes: doctorNotes.trim() || null,
        content: updatedContent || report.content, // Doktor içeriği düzenlediyse güncelle
        approvedBy: doctorId,
      },
    });

    return NextResponse.json({
      message: "Rapor reddedildi",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Error rejecting report:", error);
    return NextResponse.json(
      { error: "Rapor reddedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

