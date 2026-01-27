import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const markReadSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const validated = markReadSchema.parse(body);

    await prisma.doctorMessage.updateMany({
      where: {
        id: { in: validated.messageIds },
        patientId: auth.userId,
      },
      data: {
        patientLastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error marking messages read:", error);
    return NextResponse.json(
      { error: error?.message || "Okundu bilgisi kaydedilemedi" },
      { status: 500 }
    );
  }
}
