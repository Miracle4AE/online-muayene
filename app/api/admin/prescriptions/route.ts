import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { hashTcKimlik, decryptTcKimlik, maskTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Reçeteleri listele (hastane bazlı)
export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }

    const doctorId = request.nextUrl.searchParams.get("doctorId");
    const patientId = request.nextUrl.searchParams.get("patientId");
    const prescriptionId = request.nextUrl.searchParams.get("prescriptionId");
    const doctorName = request.nextUrl.searchParams.get("doctorName");
    const patientTcKimlikNo = request.nextUrl.searchParams.get("patientTcKimlikNo");
    const patientName = request.nextUrl.searchParams.get("patientName");

    const where: any = {
      hospitalId: hospitalId, // Sadece bu hastanenin reçeteleri
    };

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (prescriptionId) {
      where.id = prescriptionId;
    }

    // Doktor adı ile arama
    if (doctorName) {
      where.doctor = {
        ...where.doctor,
        name: {
          contains: doctorName,
          mode: "insensitive",
        },
      };
    }

    // Hasta T.C. Kimlik No ile arama
    if (patientTcKimlikNo) {
      const tcHash = hashTcKimlik(patientTcKimlikNo);
      if (!tcHash) {
        return NextResponse.json(
          { error: "T.C. Kimlik No 11 haneli olmalıdır" },
          { status: 400 }
        );
      }
      where.patient = {
        patientProfile: {
          tcKimlikNoHash: tcHash,
        },
      };
    }

    // Hasta adı/soyadı ile arama
    if (patientName) {
      where.patient = {
        ...where.patient,
        name: {
          contains: patientName,
          mode: "insensitive",
        },
      };
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            patientProfile: {
              select: {
                tcKimlikNo: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        prescriptionDate: "desc",
      },
    });

    const sanitizedPrescriptions = prescriptions.map((prescription) => ({
      ...prescription,
      patient: prescription.patient
        ? {
            ...prescription.patient,
            patientProfile: prescription.patient.patientProfile
              ? {
                  ...prescription.patient.patientProfile,
                  tcKimlikNo: prescription.patient.patientProfile.tcKimlikNo
                    ? maskTcKimlik(decryptTcKimlik(prescription.patient.patientProfile.tcKimlikNo))
                    : null,
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json({ prescriptions: sanitizedPrescriptions });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Reçeteler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

