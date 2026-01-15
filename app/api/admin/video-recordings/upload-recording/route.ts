import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { requireAuth } from "@/lib/api-auth";
import { validateFormDataFile } from "@/lib/file-validation";
import { storeFile } from "@/lib/storage";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, RATE_LIMITS.api);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    let userRole: "ADMIN" | "DOCTOR" | null = null;
    let adminInfo: { email: string; hospital: string } | null = null;
    let doctorId: string | null = null;

    const adminAccess = await verifyAdminAccess(request);
    if (adminAccess.isValid && adminAccess.hospitalId && adminAccess.email) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: adminAccess.hospitalId },
      });
      if (!hospital) {
        return NextResponse.json(
          { error: "Hastane bulunamadı" },
          { status: 404 }
        );
      }
      userRole = "ADMIN";
      adminInfo = {
        email: adminAccess.email,
        hospital: hospital.name,
      };
    } else {
      const auth = await requireAuth(request, "DOCTOR");
      if (!auth.ok) {
        return NextResponse.json(
          { error: auth.error },
          { status: auth.status }
        );
      }
      userRole = "DOCTOR";
      doctorId = auth.userId;
    }

    // Get form data
    const formData = await request.formData();
    const fileValidation = await validateFormDataFile(formData, "file", {
      allowedTypes: [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo",
      ],
      maxSize: 250 * 1024 * 1024,
      required: true,
    });
    const file = fileValidation.file;
    const appointmentId = formData.get("appointmentId") as string;

    if (!file || !fileValidation.valid || !appointmentId) {
      return NextResponse.json(
        { error: fileValidation.error || "Dosya ve randevu ID gerekli" },
        { status: 400 }
      );
    }

    // Randevuyu bul
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
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
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Randevu bulunamadı" },
        { status: 404 }
      );
    }

    // Doktor ise, randevunun kendi randevusu olduğunu kontrol et
    if (userRole === "DOCTOR") {
      if (!doctorId || doctorId !== appointment.doctorId) {
        return NextResponse.json(
          { error: "Bu randevuya erişim yetkiniz yok" },
          { status: 403 }
        );
      }
    } else if (userRole === "ADMIN" && adminInfo) {
      // Admin ise, hastane kontrolü yap
      if (
        !appointment.doctor.doctorProfile ||
        appointment.doctor.doctorProfile.hospital !== adminInfo.hospital
      ) {
        return NextResponse.json(
          { error: "Bu randevuya erişim yetkiniz yok" },
          { status: 403 }
        );
      }
    }

    const stored = await storeFile(file, "video-recordings", `recording-${appointmentId}`);
    const fileUrl = stored.url;
    
    // Mevcut kaydı bul veya yeni oluştur
    const existingRecording = await prisma.videoRecording.findFirst({
      where: { appointmentId },
      orderBy: { recordingDate: "desc" },
    });

    if (existingRecording) {
      // Mevcut kaydı güncelle
      await prisma.videoRecording.update({
        where: { id: existingRecording.id },
        data: {
          recordingFileUrl: fileUrl,
        },
      });
    } else {
      // Yeni kayıt oluştur
      await prisma.videoRecording.create({
        data: {
          appointmentId,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          videoUrl: appointment.meetingLink || "",
          recordingFileUrl: fileUrl,
          recordingDate: new Date(),
          duration: 0, // Süre daha sonra güncellenebilir
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Kayıt dosyası başarıyla yüklendi",
      recordingFileUrl: fileUrl,
    });
  } catch (error: any) {
    console.error("Error uploading recording file:", error);
    return NextResponse.json(
      { error: error.message || "Kayıt dosyası yüklenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

