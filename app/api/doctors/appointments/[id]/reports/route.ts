import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const appointmentId = resolvedParams.id;

    let userId = request.headers.get("x-user-id");
    let userRole = request.headers.get("x-user-role");

    if (!userId) {
      const token = await getToken({ req: request });
      if (token) {
        userId = token.sub || "";
        userRole = (token.role as string) || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
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

    if (appointment.doctorId !== userId) {
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

