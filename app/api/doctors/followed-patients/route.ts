import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Takip edilen hastaları listele
export async function GET(request: NextRequest) {
  try {
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Takip edilen hastaları getir
    let followedPatients: any[] = [];
    try {
      followedPatients = await prisma.followedPatient.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            include: {
              patientProfile: {
                select: {
                  tcKimlikNo: true,
                  dateOfBirth: true,
                  gender: true,
                  bloodType: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (dbError: any) {
      // Eğer tablo henüz yoksa boş array döndür
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist")) {
        console.log("FollowedPatient table does not exist yet, returning empty array");
        return NextResponse.json({
          patients: [],
        });
      }
      throw dbError;
    }

    // Hasta bilgilerini formatla
    const formattedPatients = followedPatients.map((fp) => {
      const age = fp.patient.patientProfile?.dateOfBirth
        ? Math.floor(
            (new Date().getTime() -
              new Date(fp.patient.patientProfile.dateOfBirth).getTime()) /
              (1000 * 60 * 60 * 24 * 365.25)
          )
        : null;

      return {
        id: fp.id,
        patientId: fp.patientId,
        patientName: fp.patient.name,
        patientEmail: fp.patient.email,
        patientPhone: fp.patient.phone,
        tcKimlikNo: fp.patient.patientProfile?.tcKimlikNo,
        age,
        gender: fp.patient.patientProfile?.gender,
        bloodType: fp.patient.patientProfile?.bloodType,
        notes: fp.notes,
        followedAt: fp.createdAt,
      };
    });

    return NextResponse.json({
      patients: formattedPatients,
    });
  } catch (error: any) {
    console.error("Error fetching followed patients:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        error: "Takip edilen hastalar alınırken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Hasta takip et
export async function POST(request: NextRequest) {
  try {
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;
    const body = await request.json();
    const { patientId, notes } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Hasta ID gerekli" },
        { status: 400 }
      );
    }

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Hasta var mı kontrol et
    const patient = await prisma.user.findUnique({
      where: { id: patientId, role: "PATIENT" },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Hasta bulunamadı" },
        { status: 404 }
      );
    }

    // Zaten takip ediliyor mu kontrol et
    let existing = null;
    try {
      existing = await prisma.followedPatient.findUnique({
        where: {
          doctorId_patientId: {
            doctorId,
            patientId,
          },
        },
      });
    } catch (dbError: any) {
      console.error("Error checking existing follow:", dbError);
      // Eğer tablo henüz yoksa devam et
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist") || dbError.message?.includes("no such table")) {
        console.log("FollowedPatient table does not exist yet, continuing");
      } else {
        throw dbError;
      }
    }

    if (existing) {
      return NextResponse.json(
        { error: "Bu hasta zaten takip ediliyor" },
        { status: 400 }
      );
    }

    // Takip et
    let followedPatient;
    try {
      followedPatient = await prisma.followedPatient.create({
        data: {
          doctorId,
          patientId,
          notes: notes || null,
        },
        include: {
          patient: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      console.error("Error creating followed patient:", dbError);
      console.error("Error details:", {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
      });
      
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist") || dbError.message?.includes("no such table")) {
        return NextResponse.json(
          { error: "Takip sistemi henüz hazır değil. Lütfen veritabanı migration'ını çalıştırın." },
          { status: 503 }
        );
      }
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Bu hasta zaten takip ediliyor" },
          { status: 400 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      message: "Hasta takip listesine eklendi",
      followedPatient: {
        id: followedPatient.id,
        patientId: followedPatient.patientId,
        patientName: followedPatient.patient.name,
      },
    });
  } catch (error: any) {
    console.error("Error following patient:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
      meta: error.meta,
    });
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu hasta zaten takip ediliyor" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { 
        error: "Hasta takip edilirken bir hata oluştu",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Takibi kaldır
export async function DELETE(request: NextRequest) {
  try {
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const doctorId = userId;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "Hasta ID gerekli" },
        { status: 400 }
      );
    }

    // Takibi kaldır
    try {
      await prisma.followedPatient.delete({
        where: {
          doctorId_patientId: {
            doctorId,
            patientId,
          },
        },
      });
    } catch (dbError: any) {
      if (dbError.code === "P2021" || dbError.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Takip sistemi henüz hazır değil. Lütfen veritabanı migration'ını çalıştırın." },
          { status: 503 }
        );
      }
      if (dbError.code === "P2025") {
        return NextResponse.json(
          { error: "Bu hasta takip listesinde bulunamadı" },
          { status: 404 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      message: "Hasta takip listesinden çıkarıldı",
    });
  } catch (error: any) {
    console.error("Error unfollowing patient:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Bu hasta takip listesinde bulunamadı" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Takip kaldırılırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

