import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
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

    // Favori doktorları getir
    const favorites = await prisma.favoriteDoctor.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                id: true,
                specialization: true,
                photoUrl: true,
                hospital: true,
                university: true,
                experience: true,
                appointmentPrice: true,
                bio: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Doktorların ortalama puanlarını hesapla
    const favoritesWithRatings = await Promise.all(
      favorites.map(async (favorite) => {
        const reviews = await prisma.doctorReview.findMany({
          where: {
            doctorId: favorite.doctor.doctorProfile?.id || "",
          },
          select: {
            rating: true,
          },
        });

        const averageRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        return {
          id: favorite.id,
          doctorId: favorite.doctor.id,
          doctorName: favorite.doctor.name,
          doctorEmail: favorite.doctor.email,
          doctorPhone: favorite.doctor.phone,
          specialization: favorite.doctor.doctorProfile?.specialization || "",
          photoUrl: favorite.doctor.doctorProfile?.photoUrl,
          hospital: favorite.doctor.doctorProfile?.hospital,
          university: favorite.doctor.doctorProfile?.university,
          experience: favorite.doctor.doctorProfile?.experience,
          appointmentPrice: favorite.doctor.doctorProfile?.appointmentPrice,
          bio: favorite.doctor.doctorProfile?.bio,
          averageRating: averageRating,
          totalReviews: reviews.length,
          addedAt: favorite.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      favorites: favoritesWithRatings,
    });
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: error?.message || "Favori doktorlar alınırken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

