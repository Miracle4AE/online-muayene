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
        userRole = token.role as string || "";
      }
    }

    if (!userId || userRole !== "DOCTOR") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Randevu doğrulaması ve doktor sahipliği
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

    // Bu randevuya bağlı hasta belgelerini çek
    const patientDocuments = await prisma.patientDocument.findMany({
      where: {
        appointmentId,
        patientId: appointment.patient.patientProfile?.id,
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
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    // Params'ı resolve et (Next.js 15+ için)
    const resolvedParams = await Promise.resolve(params);
    const doctorId = userId;
    const appointmentId = resolvedParams.id;

    // Randevuyu kontrol et
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
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    // Randevunun bu doktora ait olduğunu kontrol et
    if (appointment.doctorId !== doctorId) {
      return NextResponse.json(
        { error: "Bu randevu size ait değil" },
        { status: 403 }
      );
    }

    // Randevu ile ilişkili raporları getir
    const reports = await prisma.medicalReport.findMany({
      where: {
        appointmentId: appointmentId,
        doctorId: doctorId,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            patientProfile: {
              select: {
                tcKimlikNo: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Hasta belgelerini de getir
    const patientDocuments = await prisma.patientDocument.findMany({
      where: {
        appointmentId: appointmentId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      reports: reports,
      patientDocuments: patientDocuments,
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        patient: {
          id: appointment.patient.id,
          name: appointment.patient.name,
          email: appointment.patient.email,
          tcKimlikNo: appointment.patient.patientProfile?.tcKimlikNo,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching appointment reports:", error);
    return NextResponse.json(
      { error: "Raporlar alınırken bir hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}

