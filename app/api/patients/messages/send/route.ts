import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const sendMessageSchema = z.object({
  doctorId: z.string().min(1, "Doktor seçilmelidir"),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır").max(2000, "Mesaj en fazla 2000 karakter olabilir"),
  attachmentIds: z.array(z.string()).optional(), // Yüklenmiş dosya ID'leri
});

export async function POST(request: NextRequest) {
  try {
    // Authentication kontrolü
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen hasta olarak giriş yapın." },
        { status: 403 }
      );
    }

    const patientId = userId;

    // FormData veya JSON kontrolü
    const contentType = request.headers.get("content-type") || "";
    let body: any = {};
    let uploadedAttachments: Array<{ fileName: string; fileUrl: string; fileSize: number; fileType: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      // FormData ile dosya yükleme
      const formData = await request.formData();
      const doctorId = formData.get("doctorId") as string;
      const message = formData.get("message") as string;
      const files = formData.getAll("files") as File[];

      body = { doctorId, message };

      // Dosyaları yükle
      if (files && files.length > 0) {
        const uploadsDir = join(process.cwd(), "public", "message-attachments");
        if (!existsSync(uploadsDir)) {
          mkdirSync(uploadsDir, { recursive: true });
        }

        for (const file of files) {
          if (!file || file.size === 0) continue;

          // Dosya tipi kontrolü
          const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/gif",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ];
          
          if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
              { error: `Geçersiz dosya tipi: ${file.name}. Sadece PDF, resim ve Office dosyaları kabul edilir.` },
              { status: 400 }
            );
          }

          // Dosya boyutu kontrolü (10MB max)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            return NextResponse.json(
              { error: `Dosya boyutu çok büyük: ${file.name}. Maksimum 10MB olmalıdır.` },
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

          const filePath = join(uploadsDir, fileName);
          await writeFile(filePath, buffer);

          const fileUrl = `/message-attachments/${fileName}`;

          uploadedAttachments.push({
            fileName: file.name,
            fileUrl: fileUrl,
            fileSize: file.size,
            fileType: file.type,
          });
        }
      }
    } else {
      // JSON ile normal mesaj gönderme
      body = await request.json();
    }

    const validatedData = sendMessageSchema.parse(body);

    // Doktor kontrolü
    const doctor = await prisma.user.findUnique({
      where: { id: validatedData.doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile || doctor.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Bu doktor henüz onaylanmamış" },
        { status: 400 }
      );
    }

    // Bu hasta bu doktora daha önce mesaj göndermiş mi kontrol et
    const existingMessage = await prisma.doctorMessage.findFirst({
      where: {
        patientId: patientId,
        doctorId: validatedData.doctorId,
        status: {
          in: ["PENDING", "ACTIVE"],
        },
      },
    });

    if (existingMessage) {
      return NextResponse.json(
        { error: "Bu doktora zaten bir mesaj gönderdiniz. Doktor görüşmeyi kabul etmeden yeni mesaj gönderemezsiniz." },
        { status: 400 }
      );
    }

    // Engellenmiş mi kontrol et
    const blockedMessage = await prisma.doctorMessage.findFirst({
      where: {
        patientId: patientId,
        doctorId: validatedData.doctorId,
        status: "BLOCKED",
      },
    });

    if (blockedMessage) {
      return NextResponse.json(
        { error: "Bu doktor tarafından engellendiniz. Mesaj gönderemezsiniz." },
        { status: 403 }
      );
    }

    // Mesajı oluştur
    const newMessage = await prisma.doctorMessage.create({
      data: {
        patientId: patientId,
        doctorId: validatedData.doctorId,
        message: validatedData.message,
        status: "PENDING",
        attachments: {
          create: uploadedAttachments.map((att) => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize,
            fileType: att.fileType,
          })),
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: {
              select: {
                specialization: true,
                photoUrl: true,
                hospital: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
      info: "Mesajınız doktora iletildi. Doktor görüşmeyi kabul ettiğinde görüşmeye devam edebilirsiniz.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error?.message || "Mesaj gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
