import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { doctorReviewSchema } from "@/lib/validations";
import { ZodError } from "zod";

// Yorumları listele
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = params.id;

    // Doktorun var olduğunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || doctor.role !== "DOCTOR" || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    const reviews = await prisma.doctorReview.findMany({
      where: { doctorId: doctor.doctorProfile.id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Yorumlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

// Yorum ekle (sadece hasta yapabilir)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token || token.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Sadece hastalar yorum yapabilir" },
        { status: 401 }
      );
    }

    const doctorId = params.id;
    const body = await request.json();
    const validatedData = doctorReviewSchema.parse(body);

    // Doktoru bul
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || doctor.role !== "DOCTOR" || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    // Aynı hasta aynı doktora daha önce yorum yapmış mı kontrol et
    const existingReview = await prisma.doctorReview.findUnique({
      where: {
        doctorId_patientId: {
          doctorId: doctor.doctorProfile.id,
          patientId: token.id as string,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "Bu doktora zaten yorum yaptınız" },
        { status: 400 }
      );
    }

    // Yorumu oluştur
    const review = await prisma.doctorReview.create({
      data: {
        doctorId: doctor.doctorProfile.id,
        patientId: token.id as string,
        rating: validatedData.rating,
        comment: validatedData.comment,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Yorumunuz başarıyla eklendi",
        review,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Yorum eklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

