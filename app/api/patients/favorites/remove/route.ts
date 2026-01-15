import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const removeFavoriteSchema = z.object({
  doctorId: z.string().min(1, "Doktor ID gerekli"),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication kontrolü
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const patientId = auth.userId;
    const body = await request.json();
    const validatedData = removeFavoriteSchema.parse(body);

    // Favoriyi bul ve sil
    const favorite = await prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId: patientId,
          doctorId: validatedData.doctorId,
        },
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "Bu doktor favorilerinizde bulunamadı" },
        { status: 404 }
      );
    }

    await prisma.favoriteDoctor.delete({
      where: {
        id: favorite.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Doktor favorilerden çıkarıldı",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error removing favorite:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: error?.message || "Favori çıkarılırken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

