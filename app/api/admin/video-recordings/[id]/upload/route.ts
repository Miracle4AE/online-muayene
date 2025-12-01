import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordingId = params.id;

    // Admin authentication
    const adminToken = request.cookies.get("admin_token");
    if (!adminToken) {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    // Get admin info
    const adminInfoResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/info`,
      {
        headers: {
          Cookie: `admin_token=${adminToken.value}`,
        },
      }
    );

    if (!adminInfoResponse.ok) {
      return NextResponse.json(
        { error: "Admin bilgileri alınamadı" },
        { status: 401 }
      );
    }

    // Get recording
    const recording = await prisma.videoRecording.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
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
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Video kaydı bulunamadı" },
        { status: 404 }
      );
    }

    // Check if admin has access to this recording's hospital
    const adminInfo = await adminInfoResponse.json();
    if (
      recording.appointment.doctor.doctorProfile.hospital !== adminInfo.hospital
    ) {
      return NextResponse.json(
        { error: "Bu kayda erişim yetkiniz yok" },
        { status: 403 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    // Validate file type (video files)
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Geçersiz dosya tipi. Sadece video dosyaları kabul edilir." },
        { status: 400 }
      );
    }

    // Create directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public", "video-recordings");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop();
    const fileName = `recording-${recordingId}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update recording with file URL
    const fileUrl = `/video-recordings/${fileName}`;
    await prisma.videoRecording.update({
      where: { id: recordingId },
      data: {
        recordingFileUrl: fileUrl,
      },
    });

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

