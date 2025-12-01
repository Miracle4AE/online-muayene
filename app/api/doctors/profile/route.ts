import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { doctorProfileUpdateSchema } from "@/lib/validations";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    // Header'dan user ID ve role'ü al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kullanıcı ID bulunamadı. Lütfen giriş yapın." },
        { status: 401 }
      );
    }

    if (userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Sadece doktorlar bu sayfaya erişebilir." },
        { status: 403 }
      );
    }

    // Önce doktoru bul
    const doctor = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctorProfile: true,
      },
    });

    if (!doctor) {
      return NextResponse.json(
        { error: "Doktor bulunamadı" },
        { status: 404 }
      );
    }

    if (!doctor.doctorProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    // Yorumları ayrı sorgu ile al
    let reviews = [];
    let averageRating = 0;
    let totalReviews = 0;

    try {
      reviews = await prisma.doctorReview.findMany({
        where: { doctorId: doctor.doctorProfile.id },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      totalReviews = reviews.length;
      if (totalReviews > 0) {
        averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
      }
    } catch (reviewError) {
      console.error("Error fetching reviews:", reviewError);
      // Yorumlar yüklenemezse devam et
    }

    return NextResponse.json({
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      profile: {
        ...doctor.doctorProfile,
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: totalReviews,
      },
    });
  } catch (error: any) {
    console.error("Error fetching doctor profile:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: "Profil bilgileri alınırken bir hata oluştu",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // updateData'yı dışarıda tanımla ki catch bloğunda erişilebilsin
  let updateData: {
    specialization?: string;
    bio?: string | null;
    experience?: number | null;
    photoUrl?: string | null;
    hospital?: string | null;
  } = {};

  try {
    // Header'dan user ID ve role'ü al
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId) {
      return NextResponse.json(
        { error: "Kullanıcı ID bulunamadı. Lütfen giriş yapın." },
        { status: 401 }
      );
    }

    if (userRole !== "DOCTOR") {
      return NextResponse.json(
        { error: "Yetkisiz erişim. Sadece doktorlar bu sayfaya erişebilir." },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = doctorProfileUpdateSchema.parse(body);
    } catch (validationError: any) {
      if (validationError instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Geçersiz veri formatı",
            details: validationError.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Boş string'leri null'a çevir ve sadece tanımlı alanları ekle
    updateData = {};

    if (validatedData.specialization !== undefined) {
      // Specialization required olduğu için boş string gönderilirse mevcut değeri koru
      if (validatedData.specialization !== "" && validatedData.specialization.trim() !== "") {
        updateData.specialization = validatedData.specialization;
      }
    }
    
    if (validatedData.bio !== undefined) {
      updateData.bio = validatedData.bio === "" ? null : validatedData.bio;
    }
    
    if (validatedData.experience !== undefined) {
      updateData.experience = validatedData.experience || null;
    }
    
    if (validatedData.photoUrl !== undefined) {
      updateData.photoUrl = validatedData.photoUrl === "" ? null : validatedData.photoUrl;
    }
    
    if (validatedData.hospital !== undefined) {
      updateData.hospital = validatedData.hospital === "" ? null : validatedData.hospital;
    }
    
    // Undefined değerleri temizle
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // Eğer güncellenecek bir şey yoksa hata döndür
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek veri bulunamadı" },
        { status: 400 }
      );
    }

    // Doktor profilinin var olduğunu kontrol et
    const existingProfile = await prisma.doctorProfile.findUnique({
      where: { userId: userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Doktor profili bulunamadı" },
        { status: 404 }
      );
    }

    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId: userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Profil başarıyla güncellendi",
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    // Zod validation hatası
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Geçersiz veri formatı",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Prisma hatalarını yakala
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      console.error("Prisma error:", prismaError);
      
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: "Doktor profili bulunamadı" },
          { status: 404 }
        );
      }
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: "Bu bilgi zaten kullanılıyor" },
          { status: 409 }
        );
      }
    }

    // Genel hata
    console.error("Error updating doctor profile:", error);
    console.error("Error type:", typeof error);
    console.error("Error keys:", error && typeof error === 'object' ? Object.keys(error) : 'N/A');
    if (error && typeof error === 'object' && 'meta' in error) {
      console.error("Prisma meta:", (error as any).meta);
    }
    
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: "Profil güncellenirken bir hata oluştu",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        updateData: process.env.NODE_ENV === 'development' ? updateData : undefined
      },
      { status: 500 }
    );
  }
}

