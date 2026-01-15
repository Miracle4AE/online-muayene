import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";

// Build sırasında statik olarak analiz edilmesini engelle
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
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
    const adminInfo = { email: adminAccess.email, hospital: hospital.name };

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = resolvedParams.id;

    // Doktorun admin'in hastanesinde olup olmadığını kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || doctor.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    if (!doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Sadece admin'in hastanesindeki doktorları silebilir
    if (doctor.doctorProfile.hospital !== adminInfo.hospital) {
      return NextResponse.json(
        { error: "Bu doktoru silme yetkiniz yok" },
        { status: 403 }
      );
    }

    // Doktoru sil (cascade ile ilgili kayıtlar da silinecek)
    await prisma.user.delete({
      where: { id: doctorId },
    });

    return NextResponse.json({
      message: "Doktor başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Error deleting doctor:", error);
    return NextResponse.json(
      { error: error.message || "Doktor silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

