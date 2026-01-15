import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";

// Admin token kontrolü fonksiyonu
function isAdminAuthenticated(req: NextRequest): boolean {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return false;

  const verified = verifyAdminToken(token);
  if (!verified.valid || !verified.payload?.email) return false;

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(verified.payload.email);
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // /doctors route'u herkes için erişilebilir (public)
    if (path.startsWith("/doctors")) {
      return NextResponse.next();
    }

    // Admin route'ları için özel kontrol
    if (path.startsWith("/admin") && path !== "/admin" && !path.startsWith("/admin/login")) {
      if (!isAdminAuthenticated(req)) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
      // Admin girişi yapılmış, devam et
      return NextResponse.next();
    }

    // Doktor route'ları için kontrol
    if (path.startsWith("/doctor") && token?.role !== "DOCTOR") {
      return NextResponse.redirect(new URL("/auth/login?role=doctor", req.url));
    }

    // Hasta route'ları için kontrol
    if (path.startsWith("/patient") && token?.role !== "PATIENT") {
      return NextResponse.redirect(
        new URL("/auth/login?role=patient", req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public route'lar
        if (
          path === "/" ||
          path.startsWith("/auth") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/admin/login") ||
          path === "/admin" ||
          path.startsWith("/meeting") ||
          path.startsWith("/doctors")
        ) {
          return true;
        }

        // Admin route'ları için - authorized true döndür, kontrol middleware fonksiyonunda yapılacak
        // Böylece NextAuth'un varsayılan yönlendirmesi engellenir
        if (path.startsWith("/admin")) {
          return true; // Her zaman true döndür, kontrol middleware fonksiyonunda yapılıyor
        }

        // Diğer protected route'lar için NextAuth token kontrolü
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/doctor/:path*",
    "/patient/:path*",
    "/admin/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

