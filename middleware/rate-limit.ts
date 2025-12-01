import { NextRequest } from "next/server";

// Rate limiter - basit in-memory implementation
// Production'da Redis kullanılmalı

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Rate limit kontrolü
export function rateLimit(
  request: NextRequest,
  options: {
    maxRequests: number; // İzin verilen maksimum istek sayısı
    windowMs: number; // Zaman penceresi (milisaniye)
  }
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  // IP adresini al
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";

  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  // Store'da bu key var mı?
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: store[key].resetTime,
    };
  }

  // Reset time geçtiyse sıfırla
  if (now > store[key].resetTime) {
    store[key] = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: store[key].resetTime,
    };
  }

  // Limit aşıldı mı?
  if (store[key].count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: store[key].resetTime,
    };
  }

  // Count artır
  store[key].count++;

  return {
    allowed: true,
    remaining: options.maxRequests - store[key].count,
    resetTime: store[key].resetTime,
  };
}

// Rate limit sabitleri
export const RATE_LIMITS = {
  // API endpoint'leri için
  api: {
    maxRequests: 100, // 100 istek
    windowMs: 60 * 1000, // 1 dakika
  },
  
  // Login için
  login: {
    maxRequests: 5, // 5 deneme
    windowMs: 15 * 60 * 1000, // 15 dakika
  },
  
  // Register için
  register: {
    maxRequests: 3, // 3 kayıt
    windowMs: 60 * 60 * 1000, // 1 saat
  },
  
  // Şifre sıfırlama için
  forgotPassword: {
    maxRequests: 3, // 3 istek
    windowMs: 60 * 60 * 1000, // 1 saat
  },
};

// Store temizleme (memory leak önleme)
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (now > store[key].resetTime + 60000) {
      // Reset time'dan 1 dakika sonra sil
      delete store[key];
    }
  });
}, 60000); // Her dakika temizle

