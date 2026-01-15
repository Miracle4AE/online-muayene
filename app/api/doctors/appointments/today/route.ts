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

    // Bugünün başlangıcı (available-for-meeting API'si ile aynı mantık)
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0); // Local timezone'da bugünün başlangıcı
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Local timezone'da yarının başlangıcı

    if (process.env.NODE_ENV === "development") {
      console.error("📅 API - Bugünün başlangıcı (Local):", today.toISOString());
      console.error("📅 API - Bugünün sonu (Local):", tomorrow.toISOString());
      console.error("📅 API - Şu anki zaman:", now.toISOString());
    }

    // Bugünkü randevuları getir (sadece bugün içindeki randevular)
    // COMPLETED ve CANCELLED randevuları filtrele, sadece aktif randevuları göster
    // available-for-meeting API'si ile aynı mantık: sadece bugün ve gelecekteki randevular
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        status: {
          in: ["CONFIRMED", "PENDING"], // Sadece aktif randevular (available-for-meeting ile aynı)
        },
        // Sadece bugünkü randevuları göster (yarın dahil değil)
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
    console.error("📅 Toplam randevu sayısı:", appointments.length);
    if (appointments.length > 0) {
      console.error("📅 İlk randevu tarihi:", appointments[0].appointmentDate);
      console.error("📅 İlk randevu status:", appointments[0].status);
    }
    const formattedAppointments = appointments.map((appointment) => {
        // Patient null kontrolü
        if (!appointment.patient) {
          console.warn("⚠️ Patient null olan randevu:", appointment.id);
        }
        
        const age = calculateAge(appointment.patient?.patientProfile?.dateOfBirth);
        
        // appointmentDate'i ISO string'e çevir
        let appointmentDateStr: string;
        if (appointment.appointmentDate instanceof Date) {
          appointmentDateStr = appointment.appointmentDate.toISOString();
        } else if (typeof appointment.appointmentDate === 'string') {
          appointmentDateStr = appointment.appointmentDate;
        } else {
          appointmentDateStr = new Date(appointment.appointmentDate).toISOString();
        }
        
        const formatted = {
          id: appointment.id,
          appointmentDate: appointmentDateStr,
          status: appointment.status || "PENDING",
          notes: appointment.notes || null,
          meetingLink: appointment.meetingLink || null,
          patient: appointment.patient ? {
            id: appointment.patient.id,
            name: appointment.patient.name || "Bilinmeyen Hasta",
            email: appointment.patient.email || "",
            phone: appointment.patient.phone || "",
            age: age,
            dateOfBirth: appointment.patient.patientProfile?.dateOfBirth,
            gender: appointment.patient.patientProfile?.gender,
            tcKimlikNo: appointment.patient.patientProfile?.tcKimlikNo
              ? decryptTcKimlik(appointment.patient.patientProfile.tcKimlikNo)
              : null,
            bloodType: appointment.patient.patientProfile?.bloodType,
            allergies: appointment.patient.patientProfile?.allergies,
            chronicDiseases: appointment.patient.patientProfile?.chronicDiseases,
            medications: appointment.patient.patientProfile?.medications,
            address: appointment.patient.patientProfile?.address,
            emergencyContact: appointment.patient.patientProfile?.emergencyContact,
            emergencyPhone: appointment.patient.patientProfile?.emergencyPhone,
          } : {
            id: "",
            name: "Bilinmeyen Hasta",
            email: "",
            phone: "",
            age: null,
            dateOfBirth: null,
            gender: null,
            tcKimlikNo: null,
            bloodType: null,
            allergies: null,
            chronicDiseases: null,
            medications: null,
            address: null,
            emergencyContact: null,
            emergencyPhone: null,
          },
        };
        
        if (process.env.NODE_ENV === "development") {
          console.error("📅 Formatlanan randevu:", {
            id: formatted.id,
            appointmentDate: formatted.appointmentDate,
            patientName: formatted.patient.name,
            status: formatted.status,
            hasPatient: !!appointment.patient,
          });
        }
        
        return formatted;
      });
    
    if (process.env.NODE_ENV === "development") {
      console.error("📅 Formatlanan randevu sayısı:", formattedAppointments.length);
    }

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

