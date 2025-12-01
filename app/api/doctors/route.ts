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

    // Basit where clause - sadece onaylanmış doktorlar
    const where: any = {
      role: "DOCTOR",
    };

    // Tüm doktorları çek
    const allDoctors = await prisma.user.findMany({
      where,
      include: {
        doctorProfile: true,
      },
    });

    // JavaScript tarafında filtreleme
    let filteredDoctors = allDoctors.filter((doctor) => {
      // Sadece doctorProfile'i olan ve onaylanmış doktorlar
      if (!doctor.doctorProfile) return false;
      if (doctor.doctorProfile.verificationStatus !== "APPROVED") return false;

      // Uzmanlık alanı filtresi
      if (specialization && doctor.doctorProfile.specialization !== specialization) {
        return false;
      }

      // Şehir filtresi
      if (city && doctor.doctorProfile.city !== city) {
        return false;
      }

      // Hastane filtresi
      if (hospital && doctor.doctorProfile.hospital !== hospital) {
        return false;
      }

      // Arama filtresi
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = doctor.name.toLowerCase().includes(searchLower);
        const specializationMatch = doctor.doctorProfile.specialization?.toLowerCase().includes(searchLower);
        const hospitalMatch = doctor.doctorProfile.hospital?.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !specializationMatch && !hospitalMatch) {
          return false;
        }
      }

      return true;
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
    const cities = Array.from(
      new Set(
        allDoctors
          .filter((d) => d.doctorProfile?.verificationStatus === "APPROVED" && d.doctorProfile?.city)
          .map((d) => d.doctorProfile!.city!)
      )
    ).sort();

    const hospitals = Array.from(
      new Set(
        allDoctors
          .filter((d) => d.doctorProfile?.verificationStatus === "APPROVED" && d.doctorProfile?.hospital)
          .map((d) => d.doctorProfile!.hospital!)
      )
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

