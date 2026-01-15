import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, "PATIENT");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Hasta profilini bul
    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: auth.userId },
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

