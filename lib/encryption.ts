import crypto from "crypto";

const IV_LENGTH = 16; // AES blok boyutu

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;
  const isValid = !!rawKey && rawKey.length === 32;

  if (!isValid) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY must be exactly 32 characters in production");
    }

    const fallback = rawKey || "dev-insecure-key-change-me-32chars!";
    return Buffer.from(fallback.padEnd(32, "0").substring(0, 32));
  }

  return Buffer.from(rawKey);
}

// Veriyi şifrele
export function encrypt(text: string): string {
  if (!text) return "";
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // IV'yi encrypted data'nın başına ekle (deşifreleme için gerekli)
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return text; // Development ortamında veri kaybı olmasın
  }
}

// Şifrelenmiş veriyi çöz
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) {
    return encryptedText; // Şifrelenmemiş veya hatalı format
  }
  
  try {
    const parts = encryptedText.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    return encryptedText;
  }
}

// Hash fonksiyonu (tek yönlü şifreleme - şifre için)
export function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// TC Kimlik No şifrele (özel format)
export function encryptTcKimlik(tcNo: string): string {
  const normalized = normalizeTcKimlik(tcNo);
  if (!normalized) {
    return tcNo;
  }
  return encrypt(normalized);
}

// TC Kimlik No deşifrele
export function decryptTcKimlik(encryptedTcNo: string): string {
  if (!encryptedTcNo) return "";
  return decrypt(encryptedTcNo);
}

export function normalizeTcKimlik(tcNo: string): string {
  const normalized = (tcNo || "").replace(/\D/g, "").trim();
  if (normalized.length !== 11) return "";
  return normalized;
}

export function hashTcKimlik(tcNo: string): string {
  const normalized = normalizeTcKimlik(tcNo);
  if (!normalized) return "";
  return hash(normalized);
}

export function maskTcKimlik(tcNo: string): string {
  const normalized = normalizeTcKimlik(tcNo);
  if (!normalized) return "";
  return normalized.replace(/\d(?=\d{2})/g, "*");
}

// Telefon numarası şifrele
export function encryptPhone(phone: string): string {
  if (!phone) return "";
  return encrypt(phone);
}

// Telefon numarası deşifrele
export function decryptPhone(encryptedPhone: string): string {
  if (!encryptedPhone) return "";
  return decrypt(encryptedPhone);
}

// Email şifrele (opsiyonel)
export function encryptEmail(email: string): string {
  if (!email) return "";
  return encrypt(email);
}

// Email deşifrele
export function decryptEmail(encryptedEmail: string): string {
  if (!encryptedEmail) return "";
  return decrypt(encryptedEmail);
}

// Hassas sağlık verilerini şifrele (alerji, kronik hastalık vb.)
export function encryptSensitiveData(data: string): string {
  if (!data) return "";
  return encrypt(data);
}

// Hassas sağlık verilerini deşifrele
export function decryptSensitiveData(encryptedData: string): string {
  if (!encryptedData) return "";
  return decrypt(encryptedData);
}

