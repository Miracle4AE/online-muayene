import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId, email } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Hospital bilgisini al
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      return NextResponse.json(
        { error: "Hastane bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email,
      hospital: hospital.name,
      hospitalId: hospital.id,
      hospitalCity: hospital.city,
    });
  } catch (error) {
    console.error("Error fetching admin info:", error);
    return NextResponse.json(
      { error: "Bilgiler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

