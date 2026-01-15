import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const appointmentId = resolvedParams.id;

    const auth = await requireAuth(request, "DOCTOR");
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            patientProfile: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }

    if (appointment.doctorId !== auth.userId) {
      return NextResponse.json({ error: "Bu randevu size ait değil" }, { status: 403 });
    }

    if (!appointment.patient?.patientProfile?.id) {
      return NextResponse.json({ error: "Hasta profili bulunamadı" }, { status: 404 });
    }

    const patientDocuments = await prisma.patientDocument.findMany({
      where: {
        appointmentId,
        patientId: appointment.patient.patientProfile.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ patientDocuments });
  } catch (error: any) {
    console.error("Error fetching appointment documents:", error);
    return NextResponse.json(
      { error: "Belgeler alınamadı", details: error.message },
      { status: 500 }
    );
  }
}

