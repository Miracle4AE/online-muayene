import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";

// Build sırasında statik olarak analiz edilmesini engelle
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const adminAccess = await verifyAdminAccess(request);
    if (!adminAccess.isValid || !adminAccess.hospitalId || !adminAccess.email) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const hospital = await prisma.hospital.findUnique({
      where: { id: adminAccess.hospitalId },
    });
    if (!hospital) {
      return NextResponse.json(
        { error: "Hastane bulunamadı" },
        { status: 404 }
      );
    }
    const userId = adminAccess.email;

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = resolvedParams.id;

    // Doktor profilini bul
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
      include: {
        documents: true,
      },
    });

    if (!doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctorProfile.hospital && doctorProfile.hospital !== hospital.name) {
      return NextResponse.json(
        { error: "Bu doktor bu hastaneye bağlı değil" },
        { status: 403 }
      );
    }

    // Gerekli belgeleri kontrol et
    const requiredDocs = ["DIPLOMA", "TTB_BELGESI", "KIMLIK_ON", "KIMLIK_ARKA"];
    const uploadedDocs = doctorProfile.documents.map((doc) => doc.documentType);
    const missingDocs = requiredDocs.filter(
      (doc) => !uploadedDocs.includes(doc)
    );

    if (missingDocs.length > 0) {
      return NextResponse.json(
        {
          error: "Eksik belgeler var",
          missingDocuments: missingDocs,
        },
        { status: 400 }
      );
    }

    // Doktor profilini onayla
    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data: {
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
        verifiedBy: userId || null,
        emailVerified: true, // Onaylandığında email de doğrulanmış sayılır
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Doktor başarıyla onaylandı",
      doctor: updatedProfile,
    });
  } catch (error) {
    console.error("Error approving doctor:", error);
    return NextResponse.json(
      { error: "Doktor onaylanırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

