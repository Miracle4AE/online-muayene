import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Hesabınız henüz onaylanmamış" },
        { status: 403 }
      );
    }

    // FormData'yı parse et
    const formData = await request.formData();
    const patientId = formData.get("patientId") as string;
    const title = formData.get("title") as string;
    const reportType = formData.get("reportType") as string;
    const content = formData.get("content") as string;
    const file = formData.get("file") as File | null;

    // Validasyon
    if (!patientId || !title || !reportType || !content) {
      return NextResponse.json(
        { error: "Lütfen tüm zorunlu alanları doldurunuz" },
        { status: 400 }
      );
    }

    // Hasta kontrolü
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Hasta bulunamadı" },
        { status: 404 }
      );
    }

    // Dosya yükleme (varsa)
    let fileUrl: string | null = null;
    if (file && file.size > 0) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Dosya uzantısını kontrol et
        const fileName = file.name;
        const fileExtension = fileName.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];

        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
          return NextResponse.json(
            { error: "Sadece PDF, JPG, JPEG, PNG formatları desteklenmektedir" },
            { status: 400 }
          );
        }

        // Dosya boyutu kontrolü (10MB)
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: "Dosya boyutu 10MB'dan büyük olamaz" },
            { status: 400 }
          );
        }

        // Dosya adını oluştur
        const timestamp = Date.now();
        const sanitizedFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = join(process.cwd(), "public", "documents", sanitizedFileName);

        // Dizin yoksa oluştur
        const dir = join(process.cwd(), "public", "documents");
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        // Dosyayı kaydet
        await writeFile(filePath, buffer);
        fileUrl = `/documents/${sanitizedFileName}`;
      } catch (fileError: any) {
        console.error("Dosya yükleme hatası:", fileError);
        return NextResponse.json(
          { error: "Dosya yüklenirken bir hata oluştu" },
          { status: 500 }
        );
      }
    }

    // Raporu oluştur
    const report = await prisma.medicalReport.create({
      data: {
        doctorId: doctorId,
        patientId: patientId,
        reportType: reportType,
        title: title,
        content: content,
        fileUrl: fileUrl,
        aiGenerated: false, // Doktor tarafından oluşturuldu
        approvalStatus: "APPROVED", // Doktor tarafından oluşturulduğu için direkt onaylı
        approvedAt: new Date(),
        approvedBy: doctorId,
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        doctor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      report,
      message: "Rapor başarıyla oluşturuldu",
    });
  } catch (error: any) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: error.message || "Rapor oluşturulurken bir hata oluştu" },
      { status: 500 }
    );
  }
}

