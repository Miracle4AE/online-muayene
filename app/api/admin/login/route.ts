import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, RATE_LIMITS } from "@/middleware/rate-limit";
import { signAdminToken } from "@/lib/admin-token";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const adminLoginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(1, "Şifre gereklidir"),
  city: z.string().min(1, "Şehir seçimi gereklidir"),
  hospital: z.string().min(1, "Hastane adı gereklidir"),
});

export async function POST(request: NextRequest) {
  // Rate limiting kontrolü
  const limit = rateLimit(request, RATE_LIMITS.login);
  
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla deneme yaptınız. Lütfen 15 dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const validatedData = adminLoginSchema.parse(body);

    // Admin kontrolü - email, şifre ve hastane adı ile
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const adminPasswords = process.env.ADMIN_PASSWORDS?.split(",") || [];
    const adminHospitals = process.env.ADMIN_HOSPITALS?.split(",") || [];

    // Email kontrolü
    if (!adminEmails.includes(validatedData.email)) {
      return NextResponse.json(
        { error: "Geçersiz email adresi" },
        { status: 401 }
      );
    }

    // Şifre kontrolü
    const emailIndex = adminEmails.indexOf(validatedData.email);
    const expectedPassword = adminPasswords[emailIndex] || adminPasswords[0];
    
    if (process.env.NODE_ENV === "development") {
      console.log("Admin login attempt for:", validatedData.email);
      console.log("Expected password hash:", expectedPassword.startsWith("$2a$"));
    }
    
    // Şifre hash'lenmiş olabilir veya düz metin olabilir
    let isPasswordValid = false;
    
    // Hash mi kontrol et ($2a$ veya $2b$ ile başlıyorsa hash'tir)
    if (expectedPassword.startsWith("$2a$") || expectedPassword.startsWith("$2b$")) {
      // Hash'lenmiş şifre - bcrypt ile karşılaştır
      try {
        isPasswordValid = await bcrypt.compare(validatedData.password, expectedPassword);
        if (process.env.NODE_ENV === "development") {
          console.log("Hash comparison result:", isPasswordValid);
        }
      } catch (error) {
        console.error("Bcrypt compare error:", error);
        isPasswordValid = false;
      }
    } else {
      // Düz metin şifre
      isPasswordValid = validatedData.password === expectedPassword;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Geçersiz şifre" },
        { status: 401 }
      );
    }

    // Şehir ve hastane kontrolü
    const adminCities = process.env.ADMIN_CITIES?.split(",") || [];
    const expectedCity = adminCities[emailIndex] || adminCities[0];
    if (validatedData.city.toLowerCase().trim() !== expectedCity.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Geçersiz şehir seçimi" },
        { status: 401 }
      );
    }

    const expectedHospital = adminHospitals[emailIndex] || adminHospitals[0];
    
    if (process.env.NODE_ENV === "development") {
      console.log("Expected hospital:", expectedHospital);
      console.log("Received hospital:", validatedData.hospital);
    }
    
    // Hastane adı karşılaştırması (normalize edilmiş)
    const normalizedExpected = expectedHospital.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedReceived = validatedData.hospital.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (normalizedReceived !== normalizedExpected) {
      return NextResponse.json(
        { error: "Geçersiz hastane adı" },
        { status: 401 }
      );
    }

    // Database'den hastane bilgisini al
    const hospital = await prisma.hospital.findUnique({
      where: { name: validatedData.hospital },
    });

    if (!hospital) {
      return NextResponse.json(
        { error: "Hastane bulunamadı" },
        { status: 404 }
      );
    }

    // Başarılı giriş - signed admin token oluştur
    const token = signAdminToken({
      email: validatedData.email,
      hospitalId: hospital.id,
    });

    // Cookie'ye token kaydet
    const response = NextResponse.json({
      message: "Giriş başarılı",
      email: validatedData.email,
      hospital: hospital.name,
      hospitalId: hospital.id,
    });

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 saat
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Giriş işlemi sırasında bir hata oluştu" },
      { status: 500 }
    );
  }
}

