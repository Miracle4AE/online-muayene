// Basit in-memory cache
// Production'da Redis kullanılmalı

interface CacheItem {
  value: any;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheItem> = new Map();

  // Cache'e ekle
  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  // Cache'den al
  get<T = any>(key: string): T | null {
    const item = this.store.get(key);
    
    if (!item) return null;
    
    // Süresi dolmuş mu?
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  // Cache'den sil
  delete(key: string): void {
    this.store.delete(key);
  }

  // Tüm cache'i temizle
  clear(): void {
    this.store.clear();
  }

  // Pattern'e uyan key'leri sil
  deletePattern(pattern: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  // Süresi dolmuş item'ları temizle
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    
    return count;
  }
}

// Global cache instance
export const cache = new Cache();

// Otomatik temizleme (her 5 dakikada bir)
setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Cache temizlendi: ${cleaned} item silindi`);
  }
}, 5 * 60 * 1000);

// Cache helper fonksiyonlar
export const cacheKeys = {
  doctor: (id: string) => `doctor:${id}`,
  patient: (id: string) => `patient:${id}`,
  appointment: (id: string) => `appointment:${id}`,
  hospitalDoctors: (hospitalId: string) => `hospital:${hospitalId}:doctors`,
  hospitalStats: (hospitalId: string) => `hospital:${hospitalId}:stats`,
  userAppointments: (userId: string) => `user:${userId}:appointments`,
};

// Cache TTL (Time To Live) sabitleri
export const cacheTTL = {
  short: 60, // 1 dakika
  medium: 300, // 5 dakika
  long: 900, // 15 dakika
  veryLong: 3600, // 1 saat
};

