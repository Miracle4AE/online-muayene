import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const patientId = auth.userId;

    // Mesajları getir
    const messages = await prisma.doctorMessage.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        attachments: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
        replies: {
          include: {
            attachments: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Mesaj yoksa boş array döndür
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
      });
    }

    // Doktor ID'lerini topla (unique)
    const doctorIds = Array.from(new Set(messages.map((m) => m.doctorId).filter(Boolean)));

    if (doctorIds.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
      });
    }

    // Doktorları getir
    const doctors = await prisma.user.findMany({
      where: {
        id: { in: doctorIds },
      },
      include: {
        doctorProfile: true,
      },
    });

    // Doktor map oluştur
    const doctorMap: Record<string, any> = {};
    for (const doc of doctors) {
      if (doc && doc.id) {
        doctorMap[doc.id] = {
          id: doc.id,
          name: doc.name || "Bilinmeyen Doktor",
          email: doc.email || "",
          doctorProfile: doc.doctorProfile
            ? {
                id: doc.doctorProfile.id,
                specialization: doc.doctorProfile.specialization || "",
                photoUrl: doc.doctorProfile.photoUrl || null,
                hospital: doc.doctorProfile.hospital || null,
                experience: doc.doctorProfile.experience || null,
              }
            : null,
        };
      }
    }

    // Mesajları formatla
    const formattedMessages = messages
      .filter((msg) => msg && msg.id) // Null check
      .map((msg) => {
        const doctor = doctorMap[msg.doctorId] || {
          id: msg.doctorId,
          name: "Bilinmeyen Doktor",
          email: "",
          doctorProfile: null,
        };

        // Attachments'ı güvenli şekilde işle
        let attachments: any[] = [];
        try {
          if (msg.attachments && Array.isArray(msg.attachments)) {
            attachments = msg.attachments
              .filter((att: any) => att && att.id)
              .map((att: any) => ({
                id: String(att.id),
                fileName: String(att.fileName || ""),
                fileUrl: String(att.fileUrl || ""),
                fileSize: att.fileSize || null,
                fileType: att.fileType || null,
                uploadedAt: att.uploadedAt ? att.uploadedAt.toISOString() : new Date().toISOString(),
              }));
          }
        } catch (attError) {
          console.error("Error processing attachments:", attError);
          attachments = [];
        }

        let replies: any[] = [];
        try {
          if (msg.replies && Array.isArray(msg.replies)) {
            replies = msg.replies.map((reply: any) => ({
              id: String(reply.id),
              senderId: String(reply.senderId),
              senderRole: String(reply.senderRole),
              messageText: String(reply.messageText || ""),
              createdAt: reply.createdAt ? reply.createdAt.toISOString() : new Date().toISOString(),
              attachments: Array.isArray(reply.attachments)
                ? reply.attachments.map((att: any) => ({
                    id: String(att.id),
                    fileName: String(att.fileName || ""),
                    fileUrl: String(att.fileUrl || ""),
                    fileSize: att.fileSize || null,
                    fileType: att.fileType || null,
                    uploadedAt: att.uploadedAt ? att.uploadedAt.toISOString() : new Date().toISOString(),
                  }))
                : [],
            }));
          }
        } catch (replyError) {
          console.error("Error processing replies:", replyError);
          replies = [];
        }

        return {
          id: String(msg.id),
          patientId: String(msg.patientId),
          doctorId: String(msg.doctorId),
          message: String(msg.message || ""),
          status: String(msg.status || "PENDING"),
          createdAt: msg.createdAt ? msg.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: msg.updatedAt ? msg.updatedAt.toISOString() : new Date().toISOString(),
          startedAt: msg.startedAt ? msg.startedAt.toISOString() : null,
          closedAt: msg.closedAt ? msg.closedAt.toISOString() : null,
          blockedAt: msg.blockedAt ? msg.blockedAt.toISOString() : null,
          doctor: doctor,
          attachments: attachments,
          replies: replies,
        };
      });

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error("=== ERROR in /api/patients/messages ===");
    console.error("Error type:", typeof error);
    console.error("Error message:", error?.message);
    console.error("Error name:", error?.name);
    if (error?.stack) {
      console.error("Error stack:", error.stack);
    }
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Mesajlar alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
