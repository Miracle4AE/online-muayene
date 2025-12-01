import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getAdminInfo(request: NextRequest): { email: string; hospital: string } | null {
  const adminToken = request.cookies.get("admin_token");
  if (!adminToken) return null;
  
  try {
    const decoded = Buffer.from(adminToken.value, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const email = parts[0];
    const hospital = parts[1] || "";
    
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(email)) return null;
    
    let finalHospital = hospital;
    if (!finalHospital) {
      const adminHospitals = process.env.ADMIN_HOSPITALS?.split(",") || [];
      const emailIndex = adminEmails.indexOf(email);
      finalHospital = adminHospitals[emailIndex] || adminHospitals[0];
    }
    
    return { email, hospital: finalHospital };
  } catch {
    return null;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminInfo = getAdminInfo(request);
    if (!adminInfo) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const doctorId = params.id;

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

