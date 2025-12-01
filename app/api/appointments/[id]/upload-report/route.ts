import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    
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

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
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
    if (appointment.patientId !== userId) {
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

    if (!file || !title || !documentType) {
      return NextResponse.json(
        { error: "Dosya, başlık ve belge tipi zorunludur" },
        { status: 400 }
      );
    }

    // Dosya tipi kontrolü
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Geçersiz dosya tipi. Sadece PDF, JPG, JPEG ve PNG dosyaları kabul edilir." },
        { status: 400 }
      );
    }

    // Dosya boyutu kontrolü (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'dan küçük olmalıdır" },
        { status: 400 }
      );
    }

    // Dosyayı kaydet
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${random}-${originalName}`;

    const documentsDir = join(process.cwd(), "public", "documents");
    if (!existsSync(documentsDir)) {
      mkdirSync(documentsDir, { recursive: true });
    }

    const filePath = join(documentsDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/documents/${fileName}`;

    // Belgeyi veritabanına kaydet
    const document = await prisma.patientDocument.create({
      data: {
        patientId: appointment.patient.patientProfile.id,
        appointmentId: appointmentId,
        title,
        documentType,
        fileUrl,
        uploadedBy: userId,
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

