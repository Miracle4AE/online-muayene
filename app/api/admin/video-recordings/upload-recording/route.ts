import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    // Admin veya doktor authentication kontrolü
    const adminToken = request.cookies.get("admin_token");
    const sessionToken = request.cookies.get("next-auth.session-token") || request.cookies.get("__Secure-next-auth.session-token");
    
    // Admin veya doktor authentication kontrolü
    let isAuthenticated = false;
    let userRole = null;
    
    if (adminToken) {
      // Admin authentication kontrolü
      const adminInfoResponse = await fetch(
        `${request.nextUrl.origin}/api/admin/info`,
        {
          headers: {
            Cookie: `admin_token=${adminToken.value}`,
          },
        }
      );
      if (adminInfoResponse.ok) {
        isAuthenticated = true;
        userRole = "ADMIN";
      }
    } else if (sessionToken) {
      // NextAuth session kontrolü (doktor için)
      try {
        const { getToken } = await import("next-auth/jwt");
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET 
        });
        if (token && (token.role === "DOCTOR" || token.role === "ADMIN")) {
          isAuthenticated = true;
          userRole = token.role;
        }
      } catch (error) {
        console.error("Session token kontrolü hatası:", error);
      }
    }
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const appointmentId = formData.get("appointmentId") as string;

    if (!file || !appointmentId) {
      return NextResponse.json(
        { error: "Dosya ve randevu ID gerekli" },
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
      try {
        const { getToken } = await import("next-auth/jwt");
        const token = await getToken({ 
          req: request,
          secret: process.env.NEXTAUTH_SECRET 
        });
        
        if (token?.id !== appointment.doctorId) {
          return NextResponse.json(
            { error: "Bu randevuya erişim yetkiniz yok" },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error("Doktor authentication kontrolü hatası:", error);
        return NextResponse.json(
          { error: "Kimlik doğrulama hatası" },
          { status: 401 }
        );
      }
    } else if (userRole === "ADMIN") {
      // Admin ise, hastane kontrolü yap
      const adminInfoResponse = await fetch(
        `${request.nextUrl.origin}/api/admin/info`,
        {
          headers: {
            Cookie: `admin_token=${adminToken?.value}`,
          },
        }
      );

      if (!adminInfoResponse.ok) {
        return NextResponse.json(
          { error: "Admin bilgileri alınamadı" },
          { status: 401 }
        );
      }

      const adminInfo = await adminInfoResponse.json();
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

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "video-recordings");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = "webm";
    const fileName = `recording-${appointmentId}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update or create video recording
    const fileUrl = `/video-recordings/${fileName}`;
    
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

