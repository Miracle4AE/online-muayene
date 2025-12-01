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

    if (!userId || userRole !== "PATIENT") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      );
    }

    // Hasta profilini bul
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: userId },
    });

    if (!patientProfile) {
      return NextResponse.json(
        { error: "Hasta profili bulunamadı" },
        { status: 404 }
      );
    }

    // Tüm hasta raporlarını getir (appointment bilgisiyle birlikte)
    const documents = await prisma.patientDocument.findMany({
      where: {
        patientId: patientProfile.id,
      },
      include: {
        appointment: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Raporları formatla
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      documentType: doc.documentType,
      fileUrl: doc.fileUrl,
      description: doc.description,
      documentDate: doc.documentDate,
      aiAnalyzed: doc.aiAnalyzed,
      createdAt: doc.createdAt,
      appointment: doc.appointment
        ? {
            id: doc.appointment.id,
            appointmentDate: doc.appointment.appointmentDate,
            status: doc.appointment.status,
            doctor: doc.appointment.doctor
              ? {
                  id: doc.appointment.doctor.id,
                  name: doc.appointment.doctor.name,
                  email: doc.appointment.doctor.email,
                  phone: doc.appointment.doctor.phone,
                  specialization: doc.appointment.doctor.doctorProfile?.specialization,
                  hospital: doc.appointment.doctor.doctorProfile?.hospital,
                  photoUrl: doc.appointment.doctor.doctorProfile?.photoUrl,
                }
              : null,
          }
        : null,
    }));

    return NextResponse.json({
      documents: formattedDocuments,
    });
  } catch (error: any) {
    console.error("Error fetching patient documents:", error);
    return NextResponse.json(
      { error: "Raporlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

