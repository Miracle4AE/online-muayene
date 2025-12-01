// Dosya validation helper'ları

// İzin verilen dosya tipleri
export const ALLOWED_FILE_TYPES = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  documents: ["application/pdf"],
  medical: [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

// Maksimum dosya boyutları (bytes)
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  medical: 20 * 1024 * 1024, // 20MB
};

// Dosya tipi kontrolü (MIME type)
export function validateFileType(
  file: File | { type: string },
  allowedTypes: string[]
): { valid: boolean; error?: string } {
  if (!file.type) {
    return { valid: false, error: "Dosya tipi belirlenemedi" };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Geçersiz dosya tipi. İzin verilenler: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

// Dosya boyutu kontrolü
export function validateFileSize(
  file: File | { size: number },
  maxSize: number
): { valid: boolean; error?: string } {
  if (!file.size) {
    return { valid: false, error: "Dosya boyutu belirlenemedi" };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Dosya çok büyük (${fileSizeMB}MB). Maksimum: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

// Dosya adı güvenlik kontrolü (path traversal önleme)
export function sanitizeFileName(fileName: string): string {
  // Tehlikeli karakterleri temizle
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Sadece güvenli karakterler
    .replace(/\.{2,}/g, "_") // .. gibi path traversal karakterlerini engelle
    .substring(0, 255); // Maksimum uzunluk
}

// Magic bytes kontrolü (gerçek dosya tipini doğrula)
export function validateFileMagicBytes(
  buffer: Buffer,
  expectedType: string
): { valid: boolean; error?: string } {
  const magicBytes: { [key: string]: string[] } = {
    "image/jpeg": ["ffd8ffe0", "ffd8ffe1", "ffd8ffe2"],
    "image/png": ["89504e47"],
    "application/pdf": ["25504446"],
  };

  const fileHeader = buffer.toString("hex", 0, 4);

  if (expectedType in magicBytes) {
    const validHeaders = magicBytes[expectedType];
    if (!validHeaders.some((header) => fileHeader.startsWith(header))) {
      return {
        valid: false,
        error: "Dosya tipi uyuşmazlığı tespit edildi. Dosya zararlı olabilir.",
      };
    }
  }

  return { valid: true };
}

// Kapsamlı dosya validation
export async function validateUploadedFile(
  file: File,
  options: {
    allowedTypes: string[];
    maxSize: number;
    checkMagicBytes?: boolean;
  }
): Promise<{ valid: boolean; error?: string; sanitizedName?: string }> {
  // Tip kontrolü
  const typeCheck = validateFileType(file, options.allowedTypes);
  if (!typeCheck.valid) return typeCheck;

  // Boyut kontrolü
  const sizeCheck = validateFileSize(file, options.maxSize);
  if (!sizeCheck.valid) return sizeCheck;

  // Dosya adı sanitization
  const sanitizedName = sanitizeFileName(file.name);

  // Magic bytes kontrolü (opsiyonel)
  if (options.checkMagicBytes && file instanceof File) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const magicCheck = validateFileMagicBytes(buffer, file.type);
      if (!magicCheck.valid) return magicCheck;
    } catch (error) {
      return { valid: false, error: "Dosya içeriği okunamadı" };
    }
  }

  return { valid: true, sanitizedName };
}

// FormData'dan dosya çıkar ve validate et
export async function validateFormDataFile(
  formData: FormData,
  fieldName: string,
  options: {
    allowedTypes: string[];
    maxSize: number;
    required?: boolean;
  }
): Promise<{
  valid: boolean;
  file?: File;
  error?: string;
  sanitizedName?: string;
}> {
  const file = formData.get(fieldName) as File | null;

  if (!file) {
    if (options.required) {
      return { valid: false, error: "Dosya yüklenmedi" };
    }
    return { valid: true };
  }

  if (!(file instanceof File)) {
    return { valid: false, error: "Geçersiz dosya formatı" };
  }

  const validation = await validateUploadedFile(file, {
    ...options,
    checkMagicBytes: true,
  });

  if (!validation.valid) {
    return validation;
  }

  return { valid: true, file, sanitizedName: validation.sanitizedName };
}

