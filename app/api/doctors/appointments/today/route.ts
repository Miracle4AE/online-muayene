import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Bugünün başlangıcı ve sonu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugünkü randevuları getir
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        appointmentDate: {
          gte: today,
          lt: tomorrow,
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
    console.log("📅 Toplam randevu sayısı (filtre öncesi):", appointments.length);
    const formattedAppointments = appointments
      .filter((appointment) => {
        const hasPatient = !!appointment.patient;
        if (!hasPatient) {
          console.log("⚠️ Patient olmayan randevu filtrelendi:", appointment.id);
        }
        return hasPatient;
      })
      .map((appointment) => {
        const age = calculateAge(appointment.patient?.patientProfile?.dateOfBirth);
        
        const formatted = {
          id: appointment.id,
          appointmentDate: appointment.appointmentDate instanceof Date 
            ? appointment.appointmentDate.toISOString() 
            : appointment.appointmentDate,
          status: appointment.status,
          notes: appointment.notes,
          meetingLink: appointment.meetingLink,
          patient: {
            id: appointment.patient?.id || "",
            name: appointment.patient?.name || "Bilinmeyen Hasta",
            email: appointment.patient?.email || "",
            phone: appointment.patient?.phone || "",
            age: age,
            dateOfBirth: appointment.patient?.patientProfile?.dateOfBirth,
            gender: appointment.patient?.patientProfile?.gender,
            tcKimlikNo: appointment.patient?.patientProfile?.tcKimlikNo,
            bloodType: appointment.patient?.patientProfile?.bloodType,
            allergies: appointment.patient?.patientProfile?.allergies,
            chronicDiseases: appointment.patient?.patientProfile?.chronicDiseases,
            medications: appointment.patient?.patientProfile?.medications,
            address: appointment.patient?.patientProfile?.address,
            emergencyContact: appointment.patient?.patientProfile?.emergencyContact,
            emergencyPhone: appointment.patient?.patientProfile?.emergencyPhone,
          },
        };
        
        console.log("📅 Formatlanan randevu:", {
          id: formatted.id,
          appointmentDate: formatted.appointmentDate,
          patientName: formatted.patient.name,
          status: formatted.status,
        });
        
        return formatted;
      });
    
    console.log("📅 Formatlanan randevu sayısı:", formattedAppointments.length);

    return NextResponse.json({
      appointments: formattedAppointments,
    });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    return NextResponse.json(
      { error: "Bugünkü randevular alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

