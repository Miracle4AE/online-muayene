import { NextRequest, NextResponse } from "next/server";
import { validateUploadedFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
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
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    const validation = await validateUploadedFile(file, {
      allowedTypes: ALLOWED_FILE_TYPES.images,
      maxSize: MAX_FILE_SIZES.image,
      checkMagicBytes: true,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Dosya doğrulaması başarısız" },
        { status: 400 }
      );
    }

    const stored = await storeFile(file, "uploads", "profile");

    return NextResponse.json({
      success: true,
      url: stored.url,
      fileName: stored.fileName,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Dosya yüklenirken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

