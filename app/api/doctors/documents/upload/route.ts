import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateFormDataFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.api);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: ALLOWED_FILE_TYPES.medical,
      maxSize: MAX_FILE_SIZES.document,
      required: true,
    });
    const file = fileValidation.file;
    const documentType = formData.get("documentType") as string;
    const doctorId = formData.get("doctorId") as string;

    if (!file || !fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    if (!documentType || !doctorId) {
      return NextResponse.json(
        { error: "Belge tipi veya doktor ID eksik" },
        { status: 400 }
      );
    }

    const stored = await storeFile(file, "doctor-documents", `${doctorId}-${documentType}`);
    const fileUrl = stored.url;

    // Database'e kaydet
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });

    if (!doctorProfile) {
      // External storage kullanılıyorsa fiziksel dosya silme atlanır
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    const document = await prisma.doctorDocument.create({
      data: {
        doctorId: doctorProfile.id,
        documentType: documentType,
        fileUrl: fileUrl,
        fileName: file.name,
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      fileUrl,
      fileName: file.name,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Dosya yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

