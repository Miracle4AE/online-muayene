import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

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

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    const patientId = userId;

    // Randevuları getir
    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientId,
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                specialization: true,
                hospital: true,
                photoUrl: true,
              },
            },
          },
        },
        patientDocuments: {
          select: {
            id: true,
            title: true,
            documentType: true,
            fileUrl: true,
            createdAt: true,
            aiAnalyzed: true,
            description: true,
            documentDate: true,
          },
        },
        prescriptions: {
          select: {
            id: true,
            medications: true,
            diagnosis: true,
            notes: true,
            prescriptionDate: true,
            createdAt: true,
          },
          orderBy: {
            prescriptionDate: "desc",
          },
        },
        videoRecordings: {
          select: {
            id: true,
            videoUrl: true,
            recordingFileUrl: true,
            duration: true,
            recordingDate: true,
            notes: true,
            consentGiven: true,
            consentDate: true,
          },
          orderBy: {
            recordingDate: "desc",
          },
        },
      },
      orderBy: {
        appointmentDate: "desc",
      },
    });

    // Medical Reports'ları ayrı çek (appointmentId ile ilişkili)
    const appointmentIds = appointments.map((apt) => apt.id);
    const medicalReports = await prisma.medicalReport.findMany({
      where: {
        appointmentId: {
          in: appointmentIds,
        },
        patientId: patientId,
      },
      select: {
        id: true,
        appointmentId: true,
        reportType: true,
        title: true,
        content: true,
        fileUrl: true,
        aiGenerated: true,
        doctorNotes: true,
        approvalStatus: true,
        approvedAt: true,
        rejectionReason: true,
        reportDate: true,
        createdAt: true,
      },
      orderBy: {
        reportDate: "desc",
      },
    });

    // Medical Reports'ları appointmentId'ye göre grupla
    const reportsByAppointmentId = new Map<string, typeof medicalReports>();
    for (const report of medicalReports) {
      if (report.appointmentId) {
        if (!reportsByAppointmentId.has(report.appointmentId)) {
          reportsByAppointmentId.set(report.appointmentId, []);
        }
        reportsByAppointmentId.get(report.appointmentId)!.push(report);
      }
    }

    const formattedAppointments = appointments.map((apt) => ({
      id: apt.id,
      appointmentDate: apt.appointmentDate,
      status: apt.status,
      notes: apt.notes,
      meetingLink: apt.meetingLink,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt,
      doctor: {
        id: apt.doctor.id,
        name: apt.doctor.name,
        email: apt.doctor.email,
        phone: apt.doctor.phone,
        specialization: apt.doctor.doctorProfile?.specialization,
        hospital: apt.doctor.doctorProfile?.hospital,
        photoUrl: apt.doctor.doctorProfile?.photoUrl,
      },
      documents: apt.patientDocuments,
      prescriptions: apt.prescriptions,
      videoRecordings: apt.videoRecordings,
      medicalReports: reportsByAppointmentId.get(apt.id) || [],
    }));

    return NextResponse.json({
      appointments: formattedAppointments,
    });
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Randevular alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

