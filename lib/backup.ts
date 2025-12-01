import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Backup klasörü
const BACKUP_DIR = path.join(process.cwd(), "backups");

// Backup klasörünü oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Database backup oluştur
export async function createDatabaseBackup(): Promise<{
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    // SQLite için backup
    if (process.env.DATABASE_URL?.includes("sqlite")) {
      const dbPath = path.join(process.cwd(), "prisma", "dev.db");
      
      if (!fs.existsSync(dbPath)) {
        return { success: false, error: "Database dosyası bulunamadı" };
      }

      // Dosyayı kopyala
      fs.copyFileSync(dbPath, backupFilePath);

      console.log(`✅ Database backup oluşturuldu: ${backupFileName}`);
      return { success: true, filePath: backupFilePath };
    }

    // PostgreSQL için backup
    if (process.env.DATABASE_URL?.includes("postgresql")) {
      const dbUrl = process.env.DATABASE_URL;
      // URL'den bilgileri çıkar
      // postgresql://user:password@host:port/dbname
      
      const command = `pg_dump "${dbUrl}" > "${backupFilePath}"`;
      await execAsync(command);

      console.log(`✅ PostgreSQL backup oluşturuldu: ${backupFileName}`);
      return { success: true, filePath: backupFilePath };
    }

    return { success: false, error: "Desteklenmeyen database tipi" };
  } catch (error: any) {
    console.error("❌ Backup hatası:", error);
    return { success: false, error: error.message };
  }
}

// Eski backup'ları temizle (30 günden eski olanlar)
export async function cleanOldBackups(daysToKeep: number = 30): Promise<number> {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // milisaniye
    
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️ Eski backup silindi: ${file}`);
      }
    }

    return deletedCount;
  } catch (error: any) {
    console.error("❌ Backup temizleme hatası:", error);
    return 0;
  }
}

// Tüm backup'ları listele
export function listBackups(): Array<{
  fileName: string;
  filePath: string;
  size: number;
  created: Date;
}> {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    
    return files.map((file) => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      
      return {
        fileName: file,
        filePath,
        size: stats.size,
        created: stats.mtime,
      };
    }).sort((a, b) => b.created.getTime() - a.created.getTime());
  } catch (error: any) {
    console.error("❌ Backup listeleme hatası:", error);
    return [];
  }
}

// Otomatik backup (cron job ile kullanılabilir)
export async function scheduleBackup() {
  // Her gün saat 03:00'de backup al
  const now = new Date();
  const nextBackup = new Date();
  nextBackup.setHours(3, 0, 0, 0);
  
  if (nextBackup <= now) {
    nextBackup.setDate(nextBackup.getDate() + 1);
  }
  
  const timeUntilBackup = nextBackup.getTime() - now.getTime();
  
  setTimeout(async () => {
    console.log("🕐 Otomatik backup başlıyor...");
    const result = await createDatabaseBackup();
    
    if (result.success) {
      console.log("✅ Otomatik backup tamamlandı");
      // Eski backup'ları temizle
      await cleanOldBackups(30);
    }
    
    // Bir sonraki backup'ı planla
    scheduleBackup();
  }, timeUntilBackup);
  
  console.log(`⏰ Sonraki otomatik backup: ${nextBackup.toLocaleString("tr-TR")}`);
}

