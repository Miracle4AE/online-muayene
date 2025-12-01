import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = userId;
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

