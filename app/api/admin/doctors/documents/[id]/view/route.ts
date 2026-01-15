import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { verifyAdminAccess } from "@/lib/auth-helpers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const adminAccess = await verifyAdminAccess(request);
    if (!adminAccess.isValid || !adminAccess.hospitalId || !adminAccess.email) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: adminAccess.hospitalId },
    });
    if (!hospital) {
      return NextResponse.json(
        { error: "Hastane bulunamadı" },
        { status: 404 }
      );
    }
    const adminInfo = { email: adminAccess.email, hospital: hospital.name };

    const resolvedParams = await Promise.resolve(params);
    const documentId = resolvedParams.id;

    // Belgeyi bul
    const document = await prisma.doctorDocument.findUnique({
      where: { id: documentId },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Belge bulunamadı" },
        { status: 404 }
      );
    }

    // Doktorun admin'in hastanesinde olup olmadığını kontrol et
    if (document.doctor.hospital !== adminInfo.hospital) {
      return NextResponse.json(
        { error: "Bu belgeye erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    // Harici storage ise direkt yönlendir
    if (document.fileUrl.startsWith("http")) {
      return NextResponse.redirect(document.fileUrl);
    }

    // Dosya yolunu oluştur
    const fileName = document.fileUrl.split("/").pop();
    if (!fileName) {
      return NextResponse.json(
        { error: "Geçersiz dosya yolu" },
        { status: 400 }
      );
    }

    const filePath = join(process.cwd(), "public", "doctor-documents", fileName);

    // Dosya var mı kontrol et
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Dosya bulunamadı" },
        { status: 404 }
      );
    }

    // Dosyayı oku
    const fileBuffer = await readFile(filePath);

    // Dosya tipini belirle
    const fileExtension = fileName.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    
    if (fileExtension === "pdf") {
      contentType = "application/pdf";
    } else if (["jpg", "jpeg"].includes(fileExtension || "")) {
      contentType = "image/jpeg";
    } else if (fileExtension === "png") {
      contentType = "image/png";
    }

    // Dosyayı döndür
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Error viewing document:", error);
    return NextResponse.json(
      { error: error.message || "Belge görüntülenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

