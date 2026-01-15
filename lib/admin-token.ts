import crypto from "crypto";

type AdminTokenPayload = {
  email: string;
  hospitalId: string;
  exp: number; // unix timestamp seconds
};

const HEADER = { alg: "HS256", typ: "JWT" };

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function getAdminTokenSecret(): string {
  const secret = process.env.ADMIN_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("ADMIN_TOKEN_SECRET or NEXTAUTH_SECRET must be set");
  }
  return secret;
}

export function signAdminToken(payload: Omit<AdminTokenPayload, "exp">, ttlSeconds: number = 60 * 60 * 24) {
  const secret = getAdminTokenSecret();
  const headerPart = base64UrlEncode(JSON.stringify(HEADER));
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payloadPart = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const data = `${headerPart}.${payloadPart}`;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64");
  const signaturePart = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${data}.${signaturePart}`;
}

export function verifyAdminToken(token: string): { valid: boolean; payload?: AdminTokenPayload } {
  try {
    const secret = getAdminTokenSecret();
    const [headerPart, payloadPart, signaturePart] = token.split(".");
    if (!headerPart || !payloadPart || !signaturePart) {
      return { valid: false };
    }

    const data = `${headerPart}.${payloadPart}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(data).digest("base64");
    const expectedPart = expectedSignature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const sigA = Buffer.from(signaturePart);
    const sigB = Buffer.from(expectedPart);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return { valid: false };
    }

    const payload = JSON.parse(base64UrlDecode(payloadPart)) as AdminTokenPayload;
    if (!payload?.email || !payload?.hospitalId || !payload?.exp) {
      return { valid: false };
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
