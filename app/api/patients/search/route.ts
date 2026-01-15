import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { hashTcKimlik, decryptTcKimlik, maskTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Header'dan user bilgilerini al
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor || !doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    if (doctor.doctorProfile.verificationStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "Hasta araması yapabilmek için hesabınızın onaylanmış olması gerekmektedir." },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const name = searchParams.get("name");
    const tcKimlikNo = searchParams.get("tcKimlikNo");

    // En az bir arama parametresi olmalı
    if (!email && !name && !tcKimlikNo) {
      return NextResponse.json(
        { error: "Lütfen arama kriteri giriniz" },
        { status: 400 }
      );
    }

    // Minimum karakter kontrolü
    if (email && email.length < 3) {
      return NextResponse.json(
        { error: "Email için en az 3 karakter giriniz" },
        { status: 400 }
      );
    }

    if (name && name.length < 2) {
      return NextResponse.json(
        { error: "Ad/Soyad için en az 2 karakter giriniz" },
        { status: 400 }
      );
    }

    if (tcKimlikNo && tcKimlikNo.length < 11) {
      return NextResponse.json(
        { error: "T.C. Kimlik No 11 haneli olmalıdır" },
        { status: 400 }
      );
    }

    // Arama kriterlerini oluştur
    const whereClause: any = {
      role: "PATIENT",
    };

    // Email ile arama
    if (email) {
      whereClause.email = {
        contains: email.toLowerCase(),
      };
    }

    // Ad/Soyad ile arama (SQLite için case-insensitive)
    if (name) {
      whereClause.name = {
        contains: name,
      };
    }

    // T.C. Kimlik No ile arama
    if (tcKimlikNo) {
      const tcHash = hashTcKimlik(tcKimlikNo);
      if (!tcHash) {
        return NextResponse.json(
          { error: "T.C. Kimlik No 11 haneli olmalıdır" },
          { status: 400 }
        );
      }
      whereClause.patientProfile = {
        tcKimlikNoHash: {
          equals: tcHash,
        },
      };
    }

    // Hasta ara
    const patients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        patientProfile: {
          select: {
            id: true,
            tcKimlikNo: true,
            dateOfBirth: true,
            gender: true,
            bloodType: true,
            allergies: true,
            chronicDiseases: true,
            medications: true,
          },
        },
        patientAppointments: {
          where: {
            doctorId: auth.userId,
          },
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
          orderBy: {
            appointmentDate: "desc",
          },
          take: 1,
        },
      },
      take: 10,
    });

    return NextResponse.json({
      patients: patients.map(patient => ({
        ...patient,
        lastAppointment: patient.patientAppointments[0] || null,
        patientAppointments: undefined,
        patientProfile: patient.patientProfile
          ? {
              ...patient.patientProfile,
              tcKimlikNo: patient.patientProfile.tcKimlikNo
                ? maskTcKimlik(decryptTcKimlik(patient.patientProfile.tcKimlikNo))
                : null,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Error searching patients:", error);
    return NextResponse.json(
      { error: "Hasta arama sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}
