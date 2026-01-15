import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const specialization = searchParams.get("specialization")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const hospital = searchParams.get("hospital")?.trim() || "";

    const where: any = {
      role: "DOCTOR",
      doctorProfile: {
        isNot: null,
        verificationStatus: "APPROVED",
        ...(specialization ? { specialization } : {}),
        ...(city ? { city } : {}),
        ...(hospital ? { hospital } : {}),
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { doctorProfile: { specialization: { contains: search, mode: "insensitive" } } },
        { doctorProfile: { hospital: { contains: search, mode: "insensitive" } } },
      ];
    }

    const filteredDoctors = await prisma.user.findMany({
      where,
      include: {
        doctorProfile: true,
      },
    });

    // Reviews'ı toplu olarak çek
    const doctorProfileIds = filteredDoctors
      .map((d) => d.doctorProfile?.id)
      .filter((id): id is string => !!id);

    const allReviews = doctorProfileIds.length > 0
      ? await prisma.doctorReview.findMany({
          where: {
            doctorId: { in: doctorProfileIds },
          },
          select: {
            doctorId: true,
            rating: true,
          },
        })
      : [];

    // Reviews'ı doctorId'ye göre grupla
    const reviewsByDoctorId = new Map<string, number[]>();
    for (const review of allReviews) {
      if (!reviewsByDoctorId.has(review.doctorId)) {
        reviewsByDoctorId.set(review.doctorId, []);
      }
      reviewsByDoctorId.get(review.doctorId)!.push(review.rating);
    }

    // Doktorları formatla
    const doctorsWithRatings = filteredDoctors
      .map((doctor) => {
        if (!doctor.doctorProfile) return null;

        const reviews = reviewsByDoctorId.get(doctor.doctorProfile.id) || [];
        const averageRating =
          reviews.length > 0
            ? reviews.reduce((sum, rating) => sum + rating, 0) / reviews.length
            : 0;

        return {
          id: doctor.id,
          name: doctor.name,
          email: doctor.email,
          phone: doctor.phone,
          profile: {
            specialization: doctor.doctorProfile.specialization,
            photoUrl: doctor.doctorProfile.photoUrl,
            hospital: doctor.doctorProfile.hospital,
            experience: doctor.doctorProfile.experience,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews: reviews.length,
          },
        };
      })
      .filter(Boolean);

    // İsme göre sırala
    doctorsWithRatings.sort((a, b) => {
      if (!a || !b) return 0;
      return a.name.localeCompare(b.name);
    });

    // Şehir ve hastane listelerini çıkar (filtreleme için)
    const filterSource = await prisma.doctorProfile.findMany({
      where: { verificationStatus: "APPROVED" },
      select: { city: true, hospital: true },
    });

    const cities = Array.from(
      new Set(filterSource.map((item) => item.city).filter(Boolean))
    ).sort();

    const hospitals = Array.from(
      new Set(filterSource.map((item) => item.hospital).filter(Boolean))
    ).sort();

    return NextResponse.json({ 
      doctors: doctorsWithRatings,
      filters: {
        cities,
        hospitals,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching doctors:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Doktorlar alınırken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

