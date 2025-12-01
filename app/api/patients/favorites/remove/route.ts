import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const removeFavoriteSchema = z.object({
  doctorId: z.string().min(1, "Doktor ID gerekli"),
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

