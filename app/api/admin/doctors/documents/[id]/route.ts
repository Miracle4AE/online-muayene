import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { del } from "@vercel/blob";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
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
        { error: "Bu belgeyi silme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Dosyayı sil (local veya blob)
    if (document.fileUrl) {
      if (document.fileUrl.startsWith("http")) {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            await del(document.fileUrl);
          } catch (fileError) {
            console.error("Error deleting blob file:", fileError);
          }
        }
      } else {
        const fileName = document.fileUrl.split("/").pop();
        if (fileName) {
          const filePath = join(process.cwd(), "public", "doctor-documents", fileName);
          if (existsSync(filePath)) {
            try {
              await unlink(filePath);
            } catch (fileError) {
              console.error("Error deleting file:", fileError);
            }
          }
        }
      }
    }

    // Veritabanından sil
    await prisma.doctorDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      message: "Belge başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: error.message || "Belge silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

