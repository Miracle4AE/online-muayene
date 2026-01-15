import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { decryptTcKimlik, maskTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { isValid, hospitalId } = await verifyAdminAccess(request);

    if (!isValid || !hospitalId) {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin olarak giriş yapın." },
        { status: 403 }
      );
    }

    // Sadece bu hastanenin mesajlarını getir
    const messages = await prisma.doctorMessage.findMany({
      where: {
        hospitalId: hospitalId,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            patientProfile: {
              select: {
                tcKimlikNo: true,
                dateOfBirth: true,
                gender: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                specialization: true,
                licenseNumber: true,
                hospital: true,
              },
            },
          },
        },
        attachments: {
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Mesajları formatla
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      patientId: msg.patientId,
      doctorId: msg.doctorId,
      message: msg.message,
      status: msg.status,
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
      startedAt: msg.startedAt ? msg.startedAt.toISOString() : null,
      closedAt: msg.closedAt ? msg.closedAt.toISOString() : null,
      blockedAt: msg.blockedAt ? msg.blockedAt.toISOString() : null,
      patient: msg.patient
        ? {
            id: msg.patient.id,
            name: msg.patient.name,
            email: msg.patient.email,
            phone: msg.patient.phone,
            tcKimlikNo: msg.patient.patientProfile?.tcKimlikNo
              ? maskTcKimlik(decryptTcKimlik(msg.patient.patientProfile.tcKimlikNo))
              : null,
            dateOfBirth: msg.patient.patientProfile?.dateOfBirth
              ? msg.patient.patientProfile.dateOfBirth.toISOString()
              : null,
            gender: msg.patient.patientProfile?.gender || null,
          }
        : null,
      doctor: msg.doctor
        ? {
            id: msg.doctor.id,
            name: msg.doctor.name,
            email: msg.doctor.email,
            phone: msg.doctor.phone,
            specialization: msg.doctor.doctorProfile?.specialization || null,
            licenseNumber: msg.doctor.doctorProfile?.licenseNumber || null,
            hospital: msg.doctor.doctorProfile?.hospital || null,
          }
        : null,
      attachments: msg.attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize,
        fileType: att.fileType,
        uploadedAt: att.uploadedAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error("Error fetching admin messages:", error);
    return NextResponse.json(
      { error: error?.message || "Mesajlar alınırken bir hata oluştu" },
      { status: 500 }
    );
  }
}

