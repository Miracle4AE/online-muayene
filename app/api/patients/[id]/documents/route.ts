import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    // Hasta kendi belgelerini veya doktor hasta belgelerini görebilir
    if (!userId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const patientId = params.id;

    // Kullanıcı hasta ise sadece kendi belgelerini görebilir
    if (userRole === "PATIENT" && userId !== patientId) {
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
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const patientId = params.id;

    // Sadece hasta kendi belgesini yükleyebilir
    if (userRole !== "PATIENT" || userId !== patientId) {
      return NextResponse.json(
        { error: "Sadece kendi belgelerinizi yükleyebilirsiniz" },
        { status: 403 }
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

    // Dosya boyutu kontrolü (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'dan küçük olmalıdır" },
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
        patientId: patientProfile.id,
        title,
        documentType,
        fileUrl,
        uploadedBy: userId,
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
