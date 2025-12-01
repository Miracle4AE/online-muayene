import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Header'dan user ID ve role'ü al
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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugünkü ve gelecekteki CONFIRMED randevuları getir
    // Not: Randevu saati geçmiş olsa bile bugün içindeyse göster (15 dakika tolerans)
    // Ayrıca gelecekteki tüm randevuları göster
    const fifteenMinutesAgo = new Date(now);
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        status: "CONFIRMED",
        OR: [
          {
            // Bugün içindeki randevular (15 dakika tolerans ile)
            appointmentDate: {
              gte: fifteenMinutesAgo,
              lt: tomorrow, // Bugünün sonuna kadar
            },
          },
          {
            // Gelecekteki randevular
            appointmentDate: {
              gte: tomorrow,
            },
          },
        ],
      },
      include: {
        patient: {
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
          },
        },
        videoRecordings: {
          select: {
            id: true,
            recordingDate: true,
            duration: true,
          },
          orderBy: {
            recordingDate: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        appointmentDate: "asc",
      },
    });

    // Randevuları filtrele ve formatla
    const availableAppointments = appointments.map((apt) => {
      const appointmentTime = new Date(apt.appointmentDate);
      const appointmentEndTime = new Date(appointmentTime);
      appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + 15); // 15 dakika görüşme

      // Son görüşme varsa, 5 dakika boşluk ekle
      const lastRecording = apt.videoRecordings[0];
      let availableFrom = appointmentTime;
      
      if (lastRecording) {
        const lastRecordingEnd = new Date(lastRecording.recordingDate);
        lastRecordingEnd.setSeconds(lastRecordingEnd.getSeconds() + (lastRecording.duration || 0));
        const breakTime = new Date(lastRecordingEnd);
        breakTime.setMinutes(breakTime.getMinutes() + 5); // 5 dakika boşluk
        
        if (breakTime > availableFrom) {
          availableFrom = breakTime;
        }
      }

      // Yaş hesapla
      let age = null;
      if (apt.patient.patientProfile?.dateOfBirth) {
        const birthDate = new Date(apt.patient.patientProfile.dateOfBirth);
        age = now.getFullYear() - birthDate.getFullYear();
        const monthDiff = now.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        id: apt.id,
        appointmentDate: apt.appointmentDate,
        appointmentEndTime: appointmentEndTime.toISOString(),
        availableFrom: availableFrom.toISOString(),
        status: apt.status,
        notes: apt.notes,
        patient: {
          id: apt.patient.id,
          name: apt.patient.name,
          email: apt.patient.email,
          phone: apt.patient.phone,
          age,
          tcKimlikNo: apt.patient.patientProfile?.tcKimlikNo,
          gender: apt.patient.patientProfile?.gender,
          bloodType: apt.patient.patientProfile?.bloodType,
          allergies: apt.patient.patientProfile?.allergies,
          chronicDiseases: apt.patient.patientProfile?.chronicDiseases,
          medications: apt.patient.patientProfile?.medications,
        },
        canStartNow: availableFrom <= now && now < appointmentEndTime,
        timeUntilStart: availableFrom > now ? Math.max(0, Math.floor((availableFrom.getTime() - now.getTime()) / 1000 / 60)) : 0, // dakika
      };
    });

    return NextResponse.json({
      appointments: availableAppointments,
      now: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching available appointments:", error);
    return NextResponse.json(
      { error: "Randevular alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

