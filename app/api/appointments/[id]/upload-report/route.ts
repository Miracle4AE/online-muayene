import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { validateFormDataFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
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
    
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const appointmentId = resolvedParams.id;

    // Randevuyu kontrol et
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
        doctor: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    // Randevunun bu hastaya ait olduğunu kontrol et
    if (appointment.patientId !== auth.userId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    if (!appointment.patient.patientProfile) {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const documentType = formData.get("documentType") as string;
    const description = formData.get("description") as string;
    const documentDate = formData.get("documentDate") as string;

    if (!title || !documentType) {
      return NextResponse.json(
        { error: "Dosya, başlık ve belge tipi zorunludur" },
        { status: 400 }
      );
    }
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: ALLOWED_FILE_TYPES.medical,
      maxSize: MAX_FILE_SIZES.medical,
      required: true,
    });

    if (!fileValidation.valid || !fileValidation.file) {
      return NextResponse.json(
        { error: fileValidation.error || "Dosya doğrulaması başarısız" },
        { status: 400 }
      );
    }

    const stored = await storeFile(fileValidation.file, "documents", "patient-report");
    const fileUrl = stored.url;

    // Belgeyi veritabanına kaydet
    const document = await prisma.patientDocument.create({
      data: {
        patientId: appointment.patient.patientProfile.id,
        appointmentId: appointmentId,
        title,
        documentType,
        fileUrl,
        uploadedBy: auth.userId,
        description: description || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        aiAnalyzed: false,
      },
    });

    // AI analizi için endpoint'i tetikle (asenkron)
    // Not: Bu işlemi background'da yapmak için queue kullanılabilir
    // Şimdilik direkt çağıralım
    try {
      const aiResponse = await fetch(`${request.nextUrl.origin}/api/ai/analyze-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: document.id,
          appointmentId: appointmentId,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          fileUrl: fileUrl,
          documentType: documentType,
          title: title,
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI analizi başarısız:", await aiResponse.text());
      }
    } catch (aiError) {
      console.error("AI analizi hatası:", aiError);
      // AI hatası olsa bile belge kaydedildi, kullanıcıya başarı mesajı döndür
    }

    return NextResponse.json({
      success: true,
      document,
      message: "Rapor başarıyla yüklendi. Yapay zeka analizi yapılıyor...",
    });
  } catch (error: any) {
    console.error("Error uploading report:", error);
    return NextResponse.json(
      { error: "Rapor yüklenirken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

