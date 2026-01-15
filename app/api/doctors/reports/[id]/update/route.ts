import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(
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

    // Request body'den güncellenecek verileri al
    const body = await request.json();
    const content = body.content;
    const doctorNotes = body.doctorNotes || null;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Rapor içeriği gereklidir" },
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
        { error: "Bu raporu düzenleme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Raporu güncelle
    const updatedReport = await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        content: content.trim(),
        doctorNotes: doctorNotes?.trim() || null,
      },
    });

    return NextResponse.json({
      message: "Rapor başarıyla güncellendi",
      report: updatedReport,
    });
  } catch (error: any) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Rapor güncellenirken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

