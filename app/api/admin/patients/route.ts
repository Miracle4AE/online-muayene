import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminAccess } from "@/lib/auth-helpers";
import { hashTcKimlik, decryptTcKimlik, maskTcKimlik } from "@/lib/encryption";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("=== GET /api/admin/patients START ===");
    }
    
    const { isValid, hospitalId } = await verifyAdminAccess(request);
    
    if (!isValid || !hospitalId) {
      if (process.env.NODE_ENV === "development") {
        console.log("Admin access denied");
      }
      return NextResponse.json(
        { error: "Yetkisiz erişim. Lütfen admin girişi yapın." },
        { status: 403 }
      );
    }
    if (process.env.NODE_ENV === "development") {
      console.log("Hospital ID:", hospitalId);
    }

    const doctorId = request.nextUrl.searchParams.get("doctorId");
    const doctorName = request.nextUrl.searchParams.get("doctorName")?.trim() || "";
    const patientTcKimlikNo = request.nextUrl.searchParams.get("patientTcKimlikNo")?.trim() || "";
    const patientName = request.nextUrl.searchParams.get("patientName")?.trim() || "";

    if (process.env.NODE_ENV === "development") {
      console.log("Search params:", { doctorId, doctorName, patientTcKimlikNo, patientName });
    }

    // Hastane doktorlarını getir
    const doctorWhere: any = {
      role: "DOCTOR",
      hospitalId: hospitalId, // Hospital ID ile filtreleme
      doctorProfile: {
        verificationStatus: "APPROVED",
      },
    };

    if (doctorId) {
      doctorWhere.id = doctorId;
    }

    if (doctorName) {
      doctorWhere.name = { contains: doctorName };
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Fetching doctors with where:", JSON.stringify(doctorWhere, null, 2));
    }
    
    const hospitalDoctors = await prisma.user.findMany({
      where: doctorWhere,
      select: { id: true },
    });

    const doctorIds = hospitalDoctors.map((d) => d.id);
    if (process.env.NODE_ENV === "development") {
      console.log("Found doctors:", doctorIds);
    }

    if (doctorIds.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("No doctors found, returning empty array");
      }
      return NextResponse.json({ patients: [] });
    }

    // Randevuları getir
    if (process.env.NODE_ENV === "development") {
      console.log("Fetching appointments for doctors:", doctorIds);
    }

    const appointmentWhere: any = {
      doctorId: { in: doctorIds },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    };

    if (patientTcKimlikNo) {
      const tcHash = hashTcKimlik(patientTcKimlikNo);
      if (!tcHash) {
        return NextResponse.json(
          { error: "T.C. Kimlik No 11 haneli olmalıdır" },
          { status: 400 }
        );
      }
      appointmentWhere.patient = {
        patientProfile: { tcKimlikNoHash: tcHash },
      };
    }
    
    const appointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      include: {
        patient: {
          include: {
            patientProfile: {
              select: {
                tcKimlikNo: true,
                dateOfBirth: true,
                gender: true,
                bloodType: true,
                allergies: true,
                chronicDiseases: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            doctorProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },
        prescriptions: {
          select: {
            id: true,
            diagnosis: true,
            medications: true,
            prescriptionDate: true,
            notes: true,
          },
          orderBy: {
            prescriptionDate: "desc",
          },
        },
      },
      orderBy: {
        appointmentDate: "desc",
      },
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`Found ${appointments.length} appointments`);
    }

    // JavaScript tarafında filtreleme
    let filtered = appointments;

    if (patientTcKimlikNo) {
      if (process.env.NODE_ENV === "development") {
        console.log(`After TC filter: ${filtered.length} appointments`);
      }
    }

    if (patientName) {
      const searchName = patientName.toLowerCase();
      filtered = filtered.filter(
        (apt) => apt.patient?.name?.toLowerCase().includes(searchName)
      );
      if (process.env.NODE_ENV === "development") {
        console.log(`After name filter: ${filtered.length} appointments`);
      }
    }

    // Hastaları unique hale getir
    const patientMap = new Map<string, any>();

    for (const apt of filtered) {
      if (!apt.patient || !apt.doctor) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Skipping appointment with missing patient or doctor:", apt.id);
        }
        continue;
      }

      const patientId = apt.patientId;

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          id: apt.patient.id,
          name: apt.patient.name || "",
          email: apt.patient.email || "",
          phone: apt.patient.phone || null,
          profile: apt.patient.patientProfile
            ? {
                ...apt.patient.patientProfile,
                tcKimlikNo: apt.patient.patientProfile.tcKimlikNo
                  ? maskTcKimlik(decryptTcKimlik(apt.patient.patientProfile.tcKimlikNo))
                  : null,
              }
            : null,
          appointments: [],
          diagnoses: [],
          lastAppointmentDate: apt.appointmentDate,
        });
      }

      const patient = patientMap.get(patientId)!;

      patient.appointments.push({
        id: apt.id,
        appointmentDate: apt.appointmentDate,
        status: apt.status,
        doctor: {
          id: apt.doctor.id,
          name: apt.doctor.name || "",
          specialization: apt.doctor.doctorProfile?.specialization || null,
        },
        notes: apt.notes || null,
      });

      // Prescriptions null kontrolü
      if (apt.prescriptions && Array.isArray(apt.prescriptions)) {
        for (const pres of apt.prescriptions) {
          if (pres && pres.diagnosis) {
            patient.diagnoses.push({
              id: pres.id,
              diagnosis: pres.diagnosis,
              doctor: {
                id: apt.doctor.id,
                name: apt.doctor.name || "",
                specialization: apt.doctor.doctorProfile?.specialization || null,
              },
              date: pres.prescriptionDate,
              medications: pres.medications || null,
              notes: pres.notes || null,
            });
          }
        }
      }

      // Son randevu tarihini güncelle
      try {
        const aptDate = new Date(apt.appointmentDate);
        const lastDate = new Date(patient.lastAppointmentDate);
        if (!isNaN(aptDate.getTime()) && !isNaN(lastDate.getTime()) && aptDate > lastDate) {
          patient.lastAppointmentDate = apt.appointmentDate;
        }
      } catch (dateError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error processing date for appointment:", apt.id, dateError);
        }
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`Processed ${patientMap.size} unique patients`);
    }

    const patients = Array.from(patientMap.values()).sort((a, b) => {
      try {
        const dateA = new Date(a.lastAppointmentDate).getTime();
        const dateB = new Date(b.lastAppointmentDate).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      } catch (sortError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error sorting patients:", sortError);
        }
        return 0;
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log("=== GET /api/admin/patients SUCCESS ===");
    }
    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("=== GET /api/admin/patients ERROR ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Error name:", error?.name);
    
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Hastalar alınırken bir hata oluştu: ${error?.message || "Bilinmeyen hata"}`
            : "Hastalar alınırken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
