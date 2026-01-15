import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const doctorId = auth.userId;

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

