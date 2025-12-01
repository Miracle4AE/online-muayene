import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Admin token'dan hospital ID'yi çıkar
export function getHospitalIdFromAdminToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return null;

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    
    // Format: email:hospitalId:timestamp
    if (parts.length !== 3) return null;
    
    return parts[1]; // hospitalId
  } catch {
    return null;
  }
}

// Admin email'ini token'dan al
export function getAdminEmailFromToken(request: NextRequest): string | null {
  try {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return null;

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    
    if (parts.length !== 3) return null;
    
    return parts[0]; // email
  } catch {
    return null;
  }
}

// Admin authentication kontrolü
export async function verifyAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  hospitalId: string | null;
  email: string | null;
}> {
  const hospitalId = getHospitalIdFromAdminToken(request);
  const email = getAdminEmailFromToken(request);

  if (!hospitalId || !email) {
    return { isValid: false, hospitalId: null, email: null };
  }

  // Hospital'ın var olduğunu doğrula
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
  });

  if (!hospital) {
    return { isValid: false, hospitalId: null, email: null };
  }

  // Email'in bu hastane için authorized olduğunu kontrol et
  const adminEmails = hospital.adminEmails?.split(",") || [];
  const isAuthorized = adminEmails.some(
    (adminEmail) => adminEmail.trim().toLowerCase() === email.toLowerCase()
  );

  if (!isAuthorized) {
    // Fallback: env'deki admin email'lerini kontrol et
    const envAdminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    if (!envAdminEmails.includes(email)) {
      return { isValid: false, hospitalId: null, email: null };
    }
  }

  return { isValid: true, hospitalId, email };
}

