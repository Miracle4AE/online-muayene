import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    
    // Header'dan user bilgilerini al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Doktorun onay durumunu kontrol et
    const doctor = await prisma.user.findUnique({
      where: { id: userId },
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
        { error: "Hasta bilgilerine erişebilmek için hesabınızın onaylanmış olması gerekmektedir." },
        { status: 403 }
      );
    }

    const patientId = resolvedParams.id;
    const doctorHospital = doctor.doctorProfile.hospital || "";

    // Hasta detaylarını getir
    const patient = await prisma.user.findUnique({
      where: { 
        id: patientId,
        role: "PATIENT",
      },
      include: {
        patientProfile: {
          include: {
            documents: {
              orderBy: {
                createdAt: "desc",
              },
            },
            medicalHistory: {
              orderBy: {
                visitDate: "desc",
              },
            },
          },
        },
        patientAppointments: {
          orderBy: {
            appointmentDate: "desc",
          },
          include: {
            doctor: {
              include: {
                doctorProfile: {
                  select: {
                    hospital: true,
                  },
                },
              },
            },
            prescriptions: true,
            patientDocuments: true,
            videoRecordings: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Hasta bulunamadı" },
        { status: 404 }
      );
    }

    // İzin kontrolü
    const patientProfile = patient.patientProfile;
    const shareDataWithSameHospital = patientProfile?.shareDataWithSameHospital || false;
    const shareDataWithOtherHospitals = patientProfile?.shareDataWithOtherHospitals || false;

    // Doktorun bu hastayla randevusu var mı kontrol et
    const hasAppointmentWithThisDoctor = patient.patientAppointments.some(
      apt => apt.doctorId === userId
    );

    // İzin durumunu belirle
    // 1. Doktorun kendi randevularındaki bilgileri her zaman görebilir
    // 2. Aynı hastane izni varsa ve doktor aynı hastanedeyse, aynı hastanedeki diğer doktorların bilgilerini görebilir
    // 3. Farklı hastaneler izni varsa, tüm doktorların bilgilerini görebilir
    
    let canViewSharedData = false;
    let canViewSameHospitalData = false;
    let canViewOtherHospitalsData = false;
    
    if (hasAppointmentWithThisDoctor) {
      // Doktorun kendi randevularındaki bilgileri her zaman görebilir
      canViewSharedData = true;
    }
    
    // Aynı hastane kontrolü
    if (shareDataWithSameHospital && doctorHospital) {
      // Hasta aynı hastane izni vermiş ve doktorun hastanesi var
      canViewSameHospitalData = true;
    }
    
    // Farklı hastaneler kontrolü
    if (shareDataWithOtherHospitals) {
      // Hasta farklı hastaneler izni vermiş
      canViewOtherHospitalsData = true;
    }

    // Hassas bilgileri temizle
    const { password, ...patientData } = patient;

    // Randevuları filtrele - hangi randevuların bilgilerini gösterebileceğini belirle
    patientData.patientAppointments = patient.patientAppointments.filter(apt => {
      const aptDoctorHospital = apt.doctor?.doctorProfile?.hospital || "";
      const isOwnAppointment = apt.doctorId === userId;
      const isSameHospital = aptDoctorHospital === doctorHospital && doctorHospital !== "" && aptDoctorHospital !== "";
      const isOtherHospital = aptDoctorHospital !== doctorHospital && aptDoctorHospital !== "";

      // Kendi randevusu ise her zaman göster
      if (isOwnAppointment) {
        return true;
      }

      // Farklı hastaneler izni varsa, TÜM randevuları göster (aynı hastane dahil)
      if (canViewOtherHospitalsData) {
        return true;
      }

      // Aynı hastane izni varsa ve aynı hastanedeyse göster
      if (canViewSameHospitalData && isSameHospital) {
        return true;
      }

      // Hiçbir izin yoksa, sadece kendi randevularını göster
      return false;
    });

    // MedicalReports'ları getir (randevu bazlı)
    const appointmentIds = patientData.patientAppointments.map(apt => apt.id);
    const medicalReports = appointmentIds.length > 0 ? await prisma.medicalReport.findMany({
      where: {
        appointmentId: { in: appointmentIds },
        patientId: patientId,
      },
      include: {
        doctor: {
          include: {
            doctorProfile: {
              select: {
                hospital: true,
              },
            },
          },
        },
      },
    }) : [];

    // MedicalReports'ları randevulara ekle
    const reportsByAppointmentId = new Map<string, typeof medicalReports>();
    for (const report of medicalReports) {
      if (report.appointmentId) {
        if (!reportsByAppointmentId.has(report.appointmentId)) {
          reportsByAppointmentId.set(report.appointmentId, []);
        }
        reportsByAppointmentId.get(report.appointmentId)!.push(report);
      }
    }

    // Randevulara medicalReports ekle
    patientData.patientAppointments = patientData.patientAppointments.map(apt => ({
      ...apt,
      medicalReports: reportsByAppointmentId.get(apt.id) || [],
    }));

    // MedicalHistory'yi filtrele - doktor bilgilerini kontrol et
    if (patientData.patientProfile && patientData.patientProfile.medicalHistory) {
      // MedicalHistory'deki doctorId'leri topla
      const historyDoctorIds = patientData.patientProfile.medicalHistory
        .map(h => h.doctorId)
        .filter((id): id is string => id !== null && id !== undefined);

      // Doktor bilgilerini getir
      const historyDoctors = historyDoctorIds.length > 0 ? await prisma.user.findMany({
        where: {
          id: { in: historyDoctorIds },
          role: "DOCTOR",
        },
        include: {
          doctorProfile: {
            select: {
              hospital: true,
            },
          },
        },
      }) : [];

      // Doktor hastane map'i oluştur
      const doctorHospitalMap = new Map<string, string>();
      for (const doc of historyDoctors) {
        if (doc.id && doc.doctorProfile?.hospital) {
          doctorHospitalMap.set(doc.id, doc.doctorProfile.hospital);
        }
      }

      // MedicalHistory'yi filtrele
      patientData.patientProfile.medicalHistory = patientData.patientProfile.medicalHistory.filter(history => {
        // DoctorId yoksa (hasta kendi ekledi), göster
        if (!history.doctorId) {
          return true;
        }

        // Kendi doktoru ise, göster
        if (history.doctorId === userId) {
          return true;
        }

        // Farklı hastaneler izni varsa, TÜM medical history'yi göster (aynı hastane dahil)
        if (canViewOtherHospitalsData) {
          return true;
        }

        // Doktor hastanesini kontrol et
        const historyDoctorHospital = doctorHospitalMap.get(history.doctorId) || "";
        const isSameHospital = historyDoctorHospital === doctorHospital && doctorHospital !== "" && historyDoctorHospital !== "";

        // Aynı hastane izni varsa ve aynı hastanedeyse, göster
        if (canViewSameHospitalData && isSameHospital) {
          return true;
        }

        // İzin yoksa, gizle
        return false;
      });
    }

    // İzin durumunu belirle (statistics için)
    const hasAnyPermission = canViewSharedData || canViewSameHospitalData || canViewOtherHospitalsData;

    return NextResponse.json({
      patient: patientData,
      statistics: {
        totalDocuments: hasAnyPermission ? (patient.patientProfile?.documents.length || 0) : 0,
        totalMedicalHistory: hasAnyPermission ? (patientData.patientProfile?.medicalHistory?.length || 0) : 0,
        totalAppointments: patientData.patientAppointments.length,
      },
      canViewSharedData: hasAnyPermission, // Frontend'de bilgi amaçlı
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    return NextResponse.json(
      { error: "Hasta bilgileri alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}
