import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { validateUploadedFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sendMessageSchema = z.object({
  doctorId: z.string().min(1, "Doktor seçilmelidir"),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır").max(2000, "Mesaj en fazla 2000 karakter olabilir"),
  attachmentIds: z.array(z.string()).optional(), // Yüklenmiş dosya ID'leri
});

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.api);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const patientId = auth.userId;

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
        for (const file of files) {
          if (!file || file.size === 0) continue;
          const validation = await validateUploadedFile(file, {
            allowedTypes: [
              ...ALLOWED_FILE_TYPES.documents,
              ...ALLOWED_FILE_TYPES.images,
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ],
            maxSize: MAX_FILE_SIZES.document,
            checkMagicBytes: true,
          });

          if (!validation.valid) {
            return NextResponse.json(
              { error: validation.error || `Geçersiz dosya: ${file.name}` },
              { status: 400 }
            );
          }

          const stored = await storeFile(file, "message-attachments", "message");
          const fileUrl = stored.url;

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
