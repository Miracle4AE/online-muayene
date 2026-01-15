import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/admin-token";

// Admin token doğrulama (signed)
export function getAdminTokenPayload(request: NextRequest): {
  email: string | null;
  hospitalId: string | null;
} {
  const token = request.cookies.get("admin_token")?.value;
  if (!token) return { email: null, hospitalId: null };

  const verified = verifyAdminToken(token);
  if (!verified.valid || !verified.payload) {
    return { email: null, hospitalId: null };
  }

  return {
    email: verified.payload.email,
    hospitalId: verified.payload.hospitalId,
  };
}

// Admin authentication kontrolü
export async function verifyAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  hospitalId: string | null;
  email: string | null;
}> {
  const { hospitalId, email } = getAdminTokenPayload(request);

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

