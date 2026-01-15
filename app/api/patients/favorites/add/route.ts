import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const addFavoriteSchema = z.object({
  doctorId: z.string().min(1, "Doktor ID gerekli"),
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

    const patientId = auth.userId;
    const body = await request.json();
    const validatedData = addFavoriteSchema.parse(body);

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

    // Zaten favorilerde mi kontrol et
    const existingFavorite = await prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId: patientId,
          doctorId: validatedData.doctorId,
        },
      },
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: "Bu doktor zaten favorilerinizde" },
        { status: 400 }
      );
    }

    // Favoriye ekle
    const favorite = await prisma.favoriteDoctor.create({
      data: {
        patientId: patientId,
        doctorId: validatedData.doctorId,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
                photoUrl: true,
                hospital: true,
                appointmentPrice: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      favorite,
      message: "Doktor favorilere eklendi",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı", details: error.errors },
        { status: 400 }
      );
    }

    // Unique constraint hatası (zaten favorilerde)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu doktor zaten favorilerinizde" },
        { status: 400 }
      );
    }

    console.error("Error adding favorite:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: error?.message || "Favori eklenirken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

