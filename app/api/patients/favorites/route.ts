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

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen hasta olarak giriş yapın." },
        { status: 403 }
      );
    }

    const patientId = userId;

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

