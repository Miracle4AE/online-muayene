import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { validateFormDataFile } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.api);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const recordingId = resolvedParams.id;

    // Admin authentication
    const { isValid, hospitalId, email } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Hospital bilgisini al
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      return NextResponse.json(
        { error: "Hastane bulunamadı" },
        { status: 404 }
      );
    }

    const adminInfo = {
      email,
      hospital: hospital.name,
    };

    // Get recording
    const recording = await prisma.videoRecording.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          include: {
            doctor: {
              include: {
                doctorProfile: {
                  select: {
                    hospital: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Video kaydı bulunamadı" },
        { status: 404 }
      );
    }

    // Check if admin has access to this recording's hospital
    if (
      !recording.appointment.doctor.doctorProfile ||
      recording.appointment.doctor.doctorProfile.hospital !== adminInfo.hospital
    ) {
      return NextResponse.json(
        { error: "Bu kayda erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
      ],
      maxSize: 250 * 1024 * 1024,
      required: true,
    });
    const file = fileValidation.file;

    if (!file || !fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || "Dosya bulunamadı" },
        { status: 400 }
      );
    }
    const stored = await storeFile(file, "video-recordings", `recording-${recordingId}`);
    const fileUrl = stored.url;
    await prisma.videoRecording.update({
      where: { id: recordingId },
      data: {
        recordingFileUrl: fileUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Kayıt dosyası başarıyla yüklendi",
      recordingFileUrl: fileUrl,
    });
  } catch (error: any) {
    console.error("Error uploading recording file:", error);
    return NextResponse.json(
      { error: error.message || "Kayıt dosyası yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

