import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const adminToken = request.cookies.get("admin_token");
    const decoded = Buffer.from(adminToken!.value, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    const userId = email; // Email'i userId olarak kullan

    const body = await request.json();
    const { rejectionReason } = body;

    if (!rejectionReason || rejectionReason.trim() === "") {
      return NextResponse.json(
        { error: "Red sebebi gereklidir" },
        { status: 400 }
      );
    }

    const doctorId = params.id;

    // Doktor profilini bul
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorId },
    });

    if (!doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Doktor profilini reddet
    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data: {
        verificationStatus: "REJECTED",
        verifiedAt: new Date(),
        verifiedBy: userId || null,
        rejectionReason: rejectionReason,
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
      message: "Doktor başarıyla reddedildi",
      doctor: updatedProfile,
    });
  } catch (error) {
    console.error("Error rejecting doctor:", error);
    return NextResponse.json(
      { error: "Doktor reddedilirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

