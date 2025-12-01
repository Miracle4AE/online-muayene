import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAdminInfo(request: NextRequest): { email: string; hospital: string } | null {
  const adminToken = request.cookies.get("admin_token");
  if (!adminToken) return null;
  
  try {
    const decoded = Buffer.from(adminToken.value, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const email = parts[0];
    const hospital = parts[1] || "";
    
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(email)) return null;
    
    let finalHospital = hospital;
    if (!finalHospital) {
      const adminHospitals = process.env.ADMIN_HOSPITALS?.split(",") || [];
      const emailIndex = adminEmails.indexOf(email);
      finalHospital = adminHospitals[emailIndex] || adminHospitals[0];
    }
    
    return { email, hospital: finalHospital };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const adminInfo = getAdminInfo(request);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

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

