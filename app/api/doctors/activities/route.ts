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

    const activities: any[] = [];

    try {
      // 1. Tamamlanan randevular
      const completedAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorId,
          status: "COMPLETED",
        },
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
      });

      completedAppointments.forEach((appointment) => {
        if (appointment.patient?.name) {
          activities.push({
            type: "APPOINTMENT_COMPLETED",
            message: `${appointment.patient.name} ile randevu tamamlandı`,
            timestamp: appointment.updatedAt,
            color: "blue",
            icon: "calendar",
          });
        }
      });
    } catch (err) {
      console.error("Error fetching completed appointments:", err);
    }

    try {
      // 2. Yeni mesajlar (hastadan gelen)
      const newMessages = await prisma.doctorMessage.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      newMessages.forEach((message) => {
        if (message.patient?.name) {
          activities.push({
            type: "NEW_MESSAGE",
            message: `${message.patient.name} yeni mesaj gönderdi`,
            timestamp: message.createdAt,
            color: "blue",
            icon: "message",
          });
        }
      });
    } catch (err) {
      console.error("Error fetching messages:", err);
    }

    try {
      // 3. Onaylanan raporlar
      const approvedReports = await prisma.medicalReport.findMany({
        where: {
          doctorId: doctorId,
          status: "APPROVED",
        },
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 10,
      });

      approvedReports.forEach((report) => {
        if (report.patient?.name) {
          activities.push({
            type: "REPORT_APPROVED",
            message: `${report.patient.name} için rapor onaylandı`,
            timestamp: report.updatedAt,
            color: "orange",
            icon: "document",
          });
        }
      });
    } catch (err) {
      console.error("Error fetching reports:", err);
    }

    try {
      // 4. Yeni reçeteler
      const newPrescriptions = await prisma.prescription.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      newPrescriptions.forEach((prescription) => {
        if (prescription.patient?.name) {
          activities.push({
            type: "PRESCRIPTION_CREATED",
            message: `${prescription.patient.name} için reçete yazıldı`,
            timestamp: prescription.createdAt,
            color: "purple",
            icon: "prescription",
          });
        }
      });
    } catch (err) {
      console.error("Error fetching prescriptions:", err);
    }

    try {
      // 5. Yeni hasta kayıtları (bu doktora ilk kez randevu alan hastalar)
      // Her hastanın bu doktora ilk randevusunu bul
      const allAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorId,
        },
        include: {
          patient: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Performans için limit
      });

      // Her hastanın ilk randevusunu bul
      const firstTimePatients = new Map<string, { name: string; timestamp: Date }>();
      const seenPatients = new Set<string>();
      
      for (const appointment of allAppointments) {
        const patientId = appointment.patientId;
        if (!seenPatients.has(patientId) && appointment.patient?.name) {
          seenPatients.add(patientId);
          // Bu hastanın bu doktora daha önce randevusu var mı kontrol et
          const earlierAppointments = allAppointments.filter(
            (a) => a.patientId === patientId && a.id !== appointment.id && a.createdAt < appointment.createdAt
          );
          if (earlierAppointments.length === 0) {
            firstTimePatients.set(patientId, {
              name: appointment.patient.name,
              timestamp: appointment.createdAt,
            });
          }
        }
      }

      firstTimePatients.forEach((patient) => {
        activities.push({
          type: "NEW_PATIENT",
          message: `Yeni hasta kaydı: ${patient.name}`,
          timestamp: patient.timestamp,
          color: "green",
          icon: "user",
        });
      });
    } catch (err) {
      console.error("Error fetching new patients:", err);
    }

    try {
      // 6. Yeni belge yüklemeleri (hastalar tarafından - randevu ile ilişkili)
      const appointmentsWithDocuments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorId,
        },
        select: {
          id: true,
        },
      });

      const appointmentIds = appointmentsWithDocuments.map((a) => a.id);

      if (appointmentIds.length > 0) {
        const newDocuments = await prisma.patientDocument.findMany({
          where: {
            appointmentId: {
              in: appointmentIds,
            },
          },
          include: {
            patient: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        });

        newDocuments.forEach((document) => {
          if (document.patient?.user?.name) {
            activities.push({
              type: "DOCUMENT_UPLOADED",
              message: `${document.patient.user.name} yeni belge yükledi`,
              timestamp: document.createdAt,
              color: "purple",
              icon: "document",
            });
          }
        });
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }

    // Tüm aktiviteleri tarih sırasına göre sırala (en yeni önce)
    activities.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // En son 15 aktiviteyi al
    const recentActivities = activities.slice(0, 15);

    // Zaman formatını ekle
    const formattedActivities = recentActivities.map((activity) => {
      const now = new Date();
      const activityDate = new Date(activity.timestamp);
      const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);
      
      let timeAgo = "";
      if (diffInSeconds < 60) {
        timeAgo = "Az önce";
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        timeAgo = `${minutes} dakika önce`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        timeAgo = `${hours} saat önce`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        timeAgo = `${days} gün önce`;
      } else {
        timeAgo = activityDate.toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
        });
      }

      return {
        ...activity,
        timeAgo,
      };
    });

    return NextResponse.json({
      activities: formattedActivities,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Aktiviteler alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

