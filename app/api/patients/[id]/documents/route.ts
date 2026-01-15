import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { validateFormDataFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
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

    const auth = await requireAuth(request);

    // Hasta kendi belgelerini veya doktor hasta belgelerini görebilir
    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const patientId = resolvedParams.id;

    // Kullanıcı hasta ise sadece kendi belgelerini görebilir
    if (auth.role === "PATIENT" && auth.userId !== patientId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Hasta profilini bul
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      include: {
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!patientProfile) {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      documents: patientProfile.documents,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Belgeler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request, "PATIENT");

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const patientId = resolvedParams.id;

    // Sadece hasta kendi belgesini yükleyebilir
    if (auth.userId !== patientId) {
      return NextResponse.json(
        { error: "Sadece kendi belgelerinizi yükleyebilirsiniz" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: ALLOWED_FILE_TYPES.medical,
      maxSize: MAX_FILE_SIZES.medical,
      required: true,
    });
    const file = fileValidation.file;
    const title = formData.get("title") as string;
    const documentType = formData.get("documentType") as string;
    const description = formData.get("description") as string;
    const documentDate = formData.get("documentDate") as string;

    if (!file || !fileValidation.valid || !title || !documentType) {
      return NextResponse.json(
        { error: fileValidation.error || "Dosya, başlık ve belge tipi zorunludur" },
        { status: 400 }
      );
    }

    // Hasta profilini bul
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
    });

    if (!patientProfile) {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    const stored = await storeFile(file, "documents", `${patientId}-${documentType}`);
    const fileUrl = stored.url;

    // Belgeyi veritabanına kaydet
    const document = await prisma.patientDocument.create({
      data: {
        patientId: patientProfile.id,
        title,
        documentType,
        fileUrl,
        uploadedBy: auth.userId,
        description: description || null,
        documentDate: documentDate ? new Date(documentDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Belge yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
