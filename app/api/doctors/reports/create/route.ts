import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { validateFormDataFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const doctorId = auth.userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Hesabınız henüz onaylanmamış" },
        { status: 403 }
      );
    }

    // FormData'yı parse et
    const formData = await request.formData();
    const patientId = formData.get("patientId") as string;
    const title = formData.get("title") as string;
    const reportType = formData.get("reportType") as string;
    const content = formData.get("content") as string;
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: ALLOWED_FILE_TYPES.medical,
      maxSize: MAX_FILE_SIZES.medical,
      required: false,
    });
    const file = fileValidation.file || null;

    // Validasyon
    if (!patientId || !title || !reportType || !content) {
      return NextResponse.json(
        { error: "Lütfen tüm zorunlu alanları doldurunuz" },
        { status: 400 }
      );
    }

    // Hasta kontrolü
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Hasta bulunamadı" },
        { status: 404 }
      );
    }

    // Dosya yükleme (varsa)
    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error || "Geçersiz dosya" },
          { status: 400 }
        );
      }
      const stored = await storeFile(file, "documents", `${doctorId}-report`);
      fileUrl = stored.url;
    }

    // Raporu oluştur
    const report = await prisma.medicalReport.create({
      data: {
        doctorId: doctorId,
        patientId: patientId,
        reportType: reportType,
        title: title,
        content: content,
        fileUrl: fileUrl,
        aiGenerated: false, // Doktor tarafından oluşturuldu
        approvalStatus: "APPROVED", // Doktor tarafından oluşturulduğu için direkt onaylı
        approvedAt: new Date(),
        approvedBy: doctorId,
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        doctor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      report,
      message: "Rapor başarıyla oluşturuldu",
    });
  } catch (error: any) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: error.message || "Rapor oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

