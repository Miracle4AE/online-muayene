import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from "next/server";

type AdminTokenPayload = {
  email: string;
  hospitalId: string;
  exp: number;
};

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToString(input: string): string {
  const bytes = base64UrlToBytes(input);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

async function verifyAdminTokenEdge(token: string): Promise<{ valid: boolean; payload?: AdminTokenPayload }> {
  try {
    const secret = process.env.ADMIN_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return { valid: false };

    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) return { valid: false };

    const data = `${headerPart}.${payloadPart}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = base64UrlToBytes(signaturePart);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature.buffer,
      encoder.encode(data)
    );
    if (!isValid) return { valid: false };

    const payload = JSON.parse(base64UrlToString(payloadPart)) as AdminTokenPayload;
    if (!payload?.email || !payload?.hospitalId || !payload?.exp) return { valid: false };

    if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false };

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

// Admin token kontrolü fonksiyonu (Edge uyumlu)
async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_token")?.value;
  if (!token) return false;

  const verified = await verifyAdminTokenEdge(token);
  if (!verified.valid || !verified.payload?.email) return false;

  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  return adminEmails.includes(verified.payload.email);
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // /doctors route'u herkes için erişilebilir (public)
    if (path.startsWith("/doctors")) {
      return NextResponse.next();
    }

    // Admin route'ları için özel kontrol
    if (path.startsWith("/admin") && path !== "/admin" && !path.startsWith("/admin/login")) {
      if (!(await isAdminAuthenticated(req))) {
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

