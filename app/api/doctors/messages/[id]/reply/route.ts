import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const replyMessageSchema = z.object({
  reply: z.string().min(1, "Yanıt mesajı gerekli").max(2000, "Yanıt en fazla 2000 karakter olabilir"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = auth.userId;
    const messageId = resolvedParams.id;
    const body = await request.json();
    const validatedData = replyMessageSchema.parse(body);

    // Mesajı bul ve kontrol et
    const message = await prisma.doctorMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Mesaj bulunamadı" },
        { status: 404 }
      );
    }

    if (message.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu mesaj size ait değil" },
        { status: 403 }
      );
    }

    if (message.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif görüşmelere yanıt verebilirsiniz" },
        { status: 400 }
      );
    }

    // Yanıtı kaydet (mesajın reply alanına ekle veya yeni bir model oluştur)
    // Şimdilik mesajın message alanına yanıtı ekleyelim (basit çözüm)
    // Daha iyi çözüm: MessageReply modeli oluşturmak
    const updatedMessage = await prisma.doctorMessage.update({
      where: { id: messageId },
      data: {
        message: `${message.message}\n\n--- DOKTOR YANITI ---\n${validatedData.reply}`,
        updatedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: updatedMessage,
      info: "Yanıtınız hasta ile paylaşıldı",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error replying to message:", error);
    return NextResponse.json(
      { error: error?.message || "Yanıt gönderilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}


