import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = params.id;

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: {
          include: {
            reviews: {
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
            },
          },
        },
      },
    });

    if (!doctor || doctor.role !== "DOCTOR" || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    // Ortalama puanı hesapla
    const reviews = doctor.doctorProfile.reviews;
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return NextResponse.json({
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      profile: {
        ...doctor.doctorProfile,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json(
      { error: "Doktor bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

