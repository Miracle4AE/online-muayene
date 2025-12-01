import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";

// Build sırasında statik olarak analiz edilmesini engelle
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Onay bekleyen doktorları listele
export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const status = request.nextUrl.searchParams.get("status") || "PENDING";

    // Sadece admin'in hastanesindeki doktorları getir
    const doctors = await prisma.user.findMany({
      where: {
        role: "DOCTOR",
        hospitalId: hospitalId, // Hospital ID ile filtreleme
        doctorProfile: {
          verificationStatus: status,
        },
      },
      include: {
        doctorProfile: {
          include: {
            documents: {
              orderBy: {
                uploadedAt: "desc",
              },
            },
          },
          // appointmentPrice alanını açıkça dahil et
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Debug: Raw Prisma response'u kontrol et
    if (doctors.length > 0) {
      console.log("=== BACKEND DEBUG ===");
      console.log("İlk doktor raw response:", JSON.stringify(doctors[0], null, 2));
      console.log("İlk doktor doctorProfile:", doctors[0].doctorProfile);
      console.log("İlk doktor appointmentPrice (raw):", doctors[0].doctorProfile?.appointmentPrice);
      console.log("İlk doktor appointmentPrice (type):", typeof doctors[0].doctorProfile?.appointmentPrice);
    }

    // Debug: İlk doktorun appointmentPrice'ını logla
    if (doctors.length > 0) {
      console.log("API Response - İlk doktor appointmentPrice:", doctors[0].doctorProfile?.appointmentPrice);
    }

    return NextResponse.json({
      doctors: doctors.map((doctor) => {
        const { password, ...doctorData } = doctor;
        // appointmentPrice'ın dahil edildiğinden emin ol
        if (doctorData.doctorProfile) {
          console.log(`Doctor ${doctorData.name} - appointmentPrice:`, doctorData.doctorProfile.appointmentPrice);
        }
        return doctorData;
      }),
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { error: "Doktorlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

