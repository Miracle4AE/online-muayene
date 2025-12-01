import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    // Header'dan user ID ve role'ü al (primary method)
    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    // Fallback: getToken kullan
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

    // Bu haftanın başlangıcı (Pazartesi)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Pazartesi
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // Bu haftanın sonu (Pazar)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Bu haftaki randevuları getir
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        appointmentDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      include: {
        patient: {
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
          },
        },
      },
      orderBy: {
        appointmentDate: "asc", // Saat saat sıralama
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

    // Randevuları formatla
    const formattedAppointments = appointments.map((appointment) => {
      const age = calculateAge(appointment.patient.patientProfile?.dateOfBirth);
      
      return {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        notes: appointment.notes,
        meetingLink: appointment.meetingLink,
        patient: {
          id: appointment.patient.id,
          name: appointment.patient.name,
          email: appointment.patient.email,
          phone: appointment.patient.phone,
          age: age,
          dateOfBirth: appointment.patient.patientProfile?.dateOfBirth,
          gender: appointment.patient.patientProfile?.gender,
          tcKimlikNo: appointment.patient.patientProfile?.tcKimlikNo,
          bloodType: appointment.patient.patientProfile?.bloodType,
          allergies: appointment.patient.patientProfile?.allergies,
          chronicDiseases: appointment.patient.patientProfile?.chronicDiseases,
          medications: appointment.patient.patientProfile?.medications,
          address: appointment.patient.patientProfile?.address,
          emergencyContact: appointment.patient.patientProfile?.emergencyContact,
          emergencyPhone: appointment.patient.patientProfile?.emergencyPhone,
        },
      };
    });

    return NextResponse.json({
      appointments: formattedAppointments,
      weekStart: weekStart,
      weekEnd: weekEnd,
    });
  } catch (error) {
    console.error("Error fetching weekly appointments:", error);
    return NextResponse.json(
      { error: "Bu haftaki randevular alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

