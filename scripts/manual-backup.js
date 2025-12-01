// Manuel backup scripti
const fs = require("fs");
const path = require("path");

const BACKUP_DIR = path.join(__dirname, "..", "backups");
const DB_PATH = path.join(__dirname, "..", "prisma", "dev.db");

// Backup klasörü yoksa oluştur
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Backup oluştur
function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.db`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(DB_PATH)) {
      console.error("❌ Database dosyası bulunamadı:", DB_PATH);
      return;
    }

    // Dosyayı kopyala
    fs.copyFileSync(DB_PATH, backupFilePath);

    const stats = fs.statSync(backupFilePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup oluşturuldu: ${backupFileName}`);
    console.log(`📦 Boyut: ${sizeMB} MB`);
    console.log(`📁 Konum: ${backupFilePath}`);
  } catch (error) {
    console.error("❌ Backup hatası:", error);
  }
}

createBackup();

