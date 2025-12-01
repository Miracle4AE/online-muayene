import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const doctorId = formData.get("doctorId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    if (!documentType || !doctorId) {
      return NextResponse.json(
        { error: "Belge tipi veya doktor ID eksik" },
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

    // Dosya boyutu kontrolü (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Dosya boyutu 10MB'dan büyük olamaz" },
        { status: 400 }
      );
    }

    // Dosya adını oluştur
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `${doctorId}_${documentType}_${timestamp}.${fileExtension}`;
    
    // Klasör yolu
    const uploadDir = join(process.cwd(), "public", "doctor-documents");
    
    // Klasör yoksa oluştur
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    // Dosyayı kaydet
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // URL oluştur
    const fileUrl = `/doctor-documents/${fileName}`;

    // Database'e kaydet
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });

    if (!doctorProfile) {
      // Dosyayı sil
      const fs = require("fs");
      const filePath = join(process.cwd(), "public", "doctor-documents", fileName);
      if (existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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

