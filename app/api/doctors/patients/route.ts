import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { decryptTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const doctorId = auth.userId;

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
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
        { error: "Hesabınız henüz onaylanmamış" },
        { status: 403 }
      );
    }

    // Bu doktorla randevusu olan tüm unique hastaları bul
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
      },
      select: {
        patientId: true,
      },
      distinct: ["patientId"],
    });

    const patientIds = appointments.map(a => a.patientId);

    if (patientIds.length === 0) {
      return NextResponse.json({
        patients: [],
      });
    }

    // Hasta bilgilerini getir
    const patients = await prisma.user.findMany({
      where: {
        id: {
          in: patientIds,
        },
        role: "PATIENT",
      },
      include: {
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
            address: true,
            emergencyContact: true,
            emergencyPhone: true,
          },
        },
        patientAppointments: {
          where: {
            doctorId: doctorId,
          },
          orderBy: {
            appointmentDate: "desc",
          },
          take: 1,
          select: {
            id: true,
            appointmentDate: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Yaş hesaplama için yardımcı fonksiyon
    const calculateAge = (dateOfBirth: Date | string | null | undefined): number | null => {
      if (!dateOfBirth) return null;
      const birthDate = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Hastaları formatla
    const formattedPatients = patients.map((patient) => {
      const age = calculateAge(patient.patientProfile?.dateOfBirth);
      const lastAppointment = patient.patientAppointments[0] || null;

      return {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        age: age,
        dateOfBirth: patient.patientProfile?.dateOfBirth,
        gender: patient.patientProfile?.gender,
        tcKimlikNo: patient.patientProfile?.tcKimlikNo
          ? decryptTcKimlik(patient.patientProfile.tcKimlikNo)
          : null,
        bloodType: patient.patientProfile?.bloodType,
        allergies: patient.patientProfile?.allergies,
        chronicDiseases: patient.patientProfile?.chronicDiseases,
        medications: patient.patientProfile?.medications,
        address: patient.patientProfile?.address,
        emergencyContact: patient.patientProfile?.emergencyContact,
        emergencyPhone: patient.patientProfile?.emergencyPhone,
        lastAppointment: lastAppointment ? {
          id: lastAppointment.id,
          date: lastAppointment.appointmentDate,
          status: lastAppointment.status,
        } : null,
      };
    });

    return NextResponse.json({
      patients: formattedPatients,
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Hastalar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

