import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
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

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen doktor olarak giriş yapın." },
        { status: 403 }
      );
    }

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = userId;
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


