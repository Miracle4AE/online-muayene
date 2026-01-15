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
        { error: "Bu raporu onaylama yetkiniz yok" },
        { status: 403 }
      );
    }

    // Raporu onayla
    const updatedReport = await prisma.medicalReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedBy: doctorId,
      },
    });

    return NextResponse.json({
      message: "Rapor başarıyla onaylandı",
      report: updatedReport,
    });
  } catch (error) {
    console.error("Error approving report:", error);
    return NextResponse.json(
      { error: "Rapor onaylanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

