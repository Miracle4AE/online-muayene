import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Build sırasında statik olarak analiz edilmesini engelle
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAdmin(request: NextRequest): boolean {
  const adminToken = request.cookies.get("admin_token");
  if (!adminToken) return false;
  
  try {
    const decoded = Buffer.from(adminToken.value, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    return adminEmails.includes(email);
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const adminToken = request.cookies.get("admin_token");
    if (!adminToken) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const decoded = Buffer.from(adminToken.value, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    const userId = email; // Email'i userId olarak kullan

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

