import crypto from "crypto";

// Encryption key (production'da mutlaka .env'den alınmalı!)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-this-in-production-32chars!!";
const IV_LENGTH = 16; // AES blok boyutu

// Veriyi şifrele
export function encrypt(text: string): string {
  if (!text) return "";
  
  try {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // IV'yi encrypted data'nın başına ekle (deşifreleme için gerekli)
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return text; // Hata durumunda düz metni döndür (veri kaybı olmasın)
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
    
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return encryptedText; // Hata durumunda encrypted metni döndür
  }
}

// Hash fonksiyonu (tek yönlü şifreleme - şifre için)
export function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// TC Kimlik No şifrele (özel format)
export function encryptTcKimlik(tcNo: string): string {
  if (!tcNo || tcNo.length !== 11) {
    return tcNo; // Geçersiz TC No
  }
  return encrypt(tcNo);
}

// TC Kimlik No deşifrele
export function decryptTcKimlik(encryptedTcNo: string): string {
  if (!encryptedTcNo) return "";
  return decrypt(encryptedTcNo);
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

