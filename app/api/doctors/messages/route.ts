import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
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

    const doctorId = userId;

    // Doktorun mesajlarını getir
    const messages = await prisma.doctorMessage.findMany({
      where: {
        doctorId: doctorId,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            patientProfile: {
              select: {
                dateOfBirth: true,
                gender: true,
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      messages: messages,
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error?.message || "Mesajlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

