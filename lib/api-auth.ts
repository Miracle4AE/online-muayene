import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export type AuthRole = "PATIENT" | "DOCTOR" | "ADMIN";

export async function getAuthUser(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return { ok: false as const, status: 401, error: "Oturum bulunamadı" };
  }

  const userId = (token.id as string) || (token.sub as string) || "";
  const role = (token.role as AuthRole) || null;

  if (!userId || !role) {
    return { ok: false as const, status: 401, error: "Geçersiz oturum" };
  }

  const headerUserId = request.headers.get("x-user-id");
  const headerUserRole = request.headers.get("x-user-role");

  if (headerUserId && headerUserId !== userId) {
    return { ok: false as const, status: 403, error: "Yetkisiz erişim" };
  }

  if (headerUserRole && headerUserRole !== role) {
    return { ok: false as const, status: 403, error: "Yetkisiz erişim" };
  }

  return { ok: true as const, userId, role, token };
}

export async function requireAuth(
  request: NextRequest,
  role?: AuthRole
) {
  const auth = await getAuthUser(request);
  if (!auth.ok) return auth;

  if (role && auth.role !== role) {
    return { ok: false as const, status: 403, error: "Yetkisiz erişim" };
  }

  return auth;
}
