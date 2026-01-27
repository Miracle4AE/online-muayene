import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { z } from "zod";
import { validateUploadedFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const replySchema = z.object({
  messageText: z.string().min(1, "Mesaj gerekli").max(2000, "Mesaj en fazla 2000 karakter olabilir"),
});

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

    const auth = await getAuthUser(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const resolvedParams = await Promise.resolve(params);
    const messageId = resolvedParams.id;

    const message = await prisma.doctorMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ error: "Mesaj bulunamadı" }, { status: 404 });
    }

    if (message.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif görüşmelere mesaj gönderebilirsiniz" },
        { status: 400 }
      );
    }

    if (auth.role === "PATIENT" && message.patientId !== auth.userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }
    if (auth.role === "DOCTOR" && message.doctorId !== auth.userId) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    let messageText = "";
    const uploadedAttachments: Array<{ fileName: string; fileUrl: string; fileSize: number; fileType: string }> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      messageText = (formData.get("message") as string) || "";
      const files = formData.getAll("files") as File[];

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

          const stored = await storeFile(file, "message-attachments", "reply");
          uploadedAttachments.push({
            fileName: file.name,
            fileUrl: stored.url,
            fileSize: file.size,
            fileType: file.type,
          });
        }
      }
    } else {
      const body = await request.json();
      messageText = body.message;
    }

    const validated = replySchema.parse({ messageText });

    const reply = await prisma.messageReply.create({
      data: {
        messageId,
        senderId: auth.userId,
        senderRole: auth.role,
        messageText: validated.messageText,
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
        attachments: true,
      },
    });

    return NextResponse.json({ success: true, reply });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: error?.message || "Yanıt gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}
