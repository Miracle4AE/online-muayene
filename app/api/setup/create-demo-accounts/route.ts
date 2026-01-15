import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encryptTcKimlik, hashTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Güvenlik: Sadece production'da ve secret token ile çalışsın
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SETUP_SECRET || "demo-setup-secret-change-in-production";
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Önce mevcut demo hesapları kontrol et ve sil
    const existingDoctor = await prisma.user.findUnique({
      where: { email: 'demo.doktor@onlinemuayene.com' },
      include: { doctorProfile: true },
    });

    if (existingDoctor) {
      await prisma.user.delete({
        where: { id: existingDoctor.id },
      });
    }

    // TC Kimlik No çakışması kontrolü
    let doctorTcNo = '12345678901';
    const existingTcDoctor = await prisma.doctorProfile.findUnique({
      where: { tcKimlikNoHash: hashTcKimlik('12345678901') },
    });

    if (existingTcDoctor) {
      doctorTcNo = '12345678902';
      const existingTcDoctor2 = await prisma.doctorProfile.findUnique({
        where: { tcKimlikNoHash: hashTcKimlik('12345678902') },
      });
      if (existingTcDoctor2) {
        doctorTcNo = '12345678903';
      }
    }

    // Demo Doktor
    const doctorPassword = await bcrypt.hash('DemoDoktor123!', 10);
    const doctor = await prisma.user.create({
      data: {
        email: 'demo.doktor@onlinemuayene.com',
        password: doctorPassword,
        name: 'Dr. Demo Doktor',
        role: 'DOCTOR',
        phone: '05551234567',
        doctorProfile: {
          create: {
            specialization: 'Aile Hekimliği',
            licenseNumber: 'DEMO123456',
            tcKimlikNo: encryptTcKimlik(doctorTcNo),
            tcKimlikNoHash: hashTcKimlik(doctorTcNo),
            bio: 'Bu bir demo doktor hesabıdır. Telif başvurusu kontrolü için oluşturulmuştur.',
            experience: 10,
            hospital: 'Demo Hastanesi',
            university: 'Demo Üniversitesi',
            graduationYear: 2010,
            workStatus: 'Tam Zamanlı',
            city: 'İstanbul',
            appointmentPrice: 200,
            verificationStatus: 'APPROVED',
            verifiedAt: new Date(),
            emailVerified: true,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    // Mevcut demo hasta kontrolü
    const existingPatient = await prisma.user.findUnique({
      where: { email: 'demo.hasta@onlinemuayene.com' },
      include: { patientProfile: true },
    });

    if (existingPatient) {
      await prisma.user.delete({
        where: { id: existingPatient.id },
      });
    }

    // TC Kimlik No çakışması kontrolü
    let patientTcNo = '98765432109';
    const existingTcPatient = await prisma.patientProfile.findUnique({
      where: { tcKimlikNoHash: hashTcKimlik('98765432109') },
    });

    if (existingTcPatient) {
      patientTcNo = '98765432108';
      const existingTcPatient2 = await prisma.patientProfile.findUnique({
        where: { tcKimlikNoHash: hashTcKimlik('98765432108') },
      });
      if (existingTcPatient2) {
        patientTcNo = '98765432107';
      }
    }

    // Demo Hasta
    const patientPassword = await bcrypt.hash('DemoHasta123!', 10);
    const patient = await prisma.user.create({
      data: {
        email: 'demo.hasta@onlinemuayene.com',
        password: patientPassword,
        name: 'Demo Hasta',
        role: 'PATIENT',
        phone: '05559876543',
        patientProfile: {
          create: {
            tcKimlikNo: encryptTcKimlik(patientTcNo),
            tcKimlikNoHash: hashTcKimlik(patientTcNo),
            dateOfBirth: new Date('1990-01-01'),
            gender: 'Erkek',
            address: 'Demo Adres, Demo Mahalle, İstanbul',
            emergencyContact: 'Demo Acil Kişi',
            emergencyPhone: '05551111111',
            bloodType: 'A Rh+',
            allergies: 'Polen',
            chronicDiseases: 'Yok',
            medications: 'Yok',
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    // Demo Randevu
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1);
    appointmentDate.setHours(14, 0, 0, 0);

    // Mevcut demo randevuları sil
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { doctorId: doctor.id },
          { patientId: patient.id },
        ],
      },
    });

    if (existingAppointments.length > 0) {
      await prisma.appointment.deleteMany({
        where: {
          OR: [
            { doctorId: doctor.id },
            { patientId: patient.id },
          ],
        },
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        appointmentDate: appointmentDate,
        status: 'CONFIRMED',
        notes: 'Demo randevu - Telif başvurusu kontrolü için',
        paymentAmount: 200,
        paymentDate: new Date(),
        paymentStatus: 'PAID',
        paymentMethod: 'CREDIT_CARD',
      },
    });

    return NextResponse.json({
      success: true,
      message: "Demo hesaplar başarıyla oluşturuldu",
      accounts: {
        doctor: {
          email: 'demo.doktor@onlinemuayene.com',
          password: 'DemoDoktor123!',
          id: doctor.id,
        },
        patient: {
          email: 'demo.hasta@onlinemuayene.com',
          password: 'DemoHasta123!',
          id: patient.id,
        },
        appointment: {
          id: appointment.id,
          date: appointmentDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Demo hesap oluşturma hatası:", error);
    return NextResponse.json(
      { 
        error: "Demo hesaplar oluşturulamadı",
        details: error.message 
      },
      { status: 500 }
    );
  }
}

