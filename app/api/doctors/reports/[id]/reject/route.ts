import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = auth.userId;
    const reportId = resolvedParams.id;

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

