import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;
    const reportId = params.id;

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

