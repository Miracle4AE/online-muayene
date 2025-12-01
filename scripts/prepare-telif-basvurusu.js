/**
 * Telif Başvurusu İçin Dosya Hazırlama Script'i
 * 
 * Bu script, telif başvurusu için gerekli dosyaları kopyalar
 * ve gizli dosyaları (API key'ler, şifreler) hariç tutar.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..');
const TARGET_DIR = path.join(__dirname, '..', 'telif-basvurusu');

// Kopyalanacak klasörler
const COPY_DIRS = [
  'app',
  'components',
  'lib',
  'middleware',
  'types',
  'scripts',
  'docs',
  'prisma/schema.prisma',
  'prisma/migrations',
];

// Kopyalanacak dosyalar
const COPY_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  '.gitignore',
  'README.md',
  'KURULUM.md',
  'middleware.ts',
  'LICENSE',
  'TELIF_BAŞVURUSU_REHBERİ.md',
  'TELIF_KONTROL_LISTESI.md',
  'DEMO_ACCOUNTS.md',
  'E_DEVLET_BELGELER_REHBERI.md',
  'ACIKLAMA_DOKUMU.md',
  'KOD_EKRAN_GORUNTULERI_REHBERI.md',
  'ARAYUZ_EKRAN_GORUNTULERI_REHBERI.md',
];

// Gönderilmeyecek dosyalar/klasörler
const EXCLUDE_PATTERNS = [
  /\.env/,
  /node_modules/,
  /\.next/,
  /out/,
  /\.vercel/,
  /\.DS_Store/,
  /\.pem$/,
  /npm-debug\.log/,
  /yarn-debug\.log/,
  /yarn-error\.log/,
  /\.tsbuildinfo$/,
  /dev\.db$/,
  /backups/,
  /public\/uploads\/[^/]+$/,
  /public\/documents\/[^/]+$/,
  /public\/doctor-documents\/[^/]+$/,
];

function shouldExclude(filePath) {
  const relativePath = path.relative(SOURCE_DIR, filePath);
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(relativePath));
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (shouldExclude(srcPath)) {
      console.log(`⏭️  Atlanıyor: ${path.relative(SOURCE_DIR, srcPath)}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
      console.log(`✅ Kopyalandı: ${path.relative(SOURCE_DIR, srcPath)}`);
    }
  }
}

function createPublicDirs() {
  const publicDirs = [
    'public',
    'public/uploads',
    'public/documents',
    'public/doctor-documents',
  ];

  publicDirs.forEach(dir => {
    const dirPath = path.join(TARGET_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Klasör oluşturuldu: ${dir}`);
    }
  });

  // Public klasöründeki statik dosyaları kopyala (kullanıcı dosyaları hariç)
  const publicSource = path.join(SOURCE_DIR, 'public');
  const publicTarget = path.join(TARGET_DIR, 'public');
  
  if (fs.existsSync(publicSource)) {
    const entries = fs.readdirSync(publicSource, { withFileTypes: true });
    
    entries.forEach(entry => {
      const srcPath = path.join(publicSource, entry.name);
      const destPath = path.join(publicTarget, entry.name);
      
      // Kullanıcı yüklediği klasörleri atla
      if (entry.isDirectory() && ['uploads', 'documents', 'doctor-documents'].includes(entry.name)) {
        return; // Zaten boş klasörler oluşturuldu
      }
      
      // Statik dosyaları kopyala (örneğin test-doctor.svg)
      if (entry.isFile() && !shouldExclude(srcPath)) {
        copyFile(srcPath, destPath);
        console.log(`✅ Kopyalandı: public/${entry.name}`);
      }
    });
  }
}

function main() {
  console.log('🚀 Telif başvurusu dosyaları hazırlanıyor...\n');

  // Hedef klasörü oluştur
  if (fs.existsSync(TARGET_DIR)) {
    console.log('⚠️  Hedef klasör zaten var, siliniyor...');
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // Klasörleri kopyala
  console.log('\n📂 Klasörler kopyalanıyor...');
  COPY_DIRS.forEach(item => {
    const srcPath = path.join(SOURCE_DIR, item);
    const destPath = path.join(TARGET_DIR, item);

    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Bulunamadı: ${item}`);
      return;
    }

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
      console.log(`✅ Kopyalandı: ${item}`);
    }
  });

  // Dosyaları kopyala
  console.log('\n📄 Dosyalar kopyalanıyor...');
  COPY_FILES.forEach(file => {
    const srcPath = path.join(SOURCE_DIR, file);
    const destPath = path.join(TARGET_DIR, file);

    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  Bulunamadı: ${file}`);
      return;
    }

    copyFile(srcPath, destPath);
    console.log(`✅ Kopyalandı: ${file}`);
  });

  // Public klasörlerini oluştur (boş)
  console.log('\n📁 Public klasörleri oluşturuluyor...');
  createPublicDirs();

  // Güvenlik kontrolü
  console.log('\n🔒 Güvenlik kontrolü yapılıyor...');
  const targetFiles = getAllFiles(TARGET_DIR);
  let hasEnvFile = false;
  let hasNodeModules = false;
  let hasDbFile = false;

  targetFiles.forEach(file => {
    if (file.includes('.env')) hasEnvFile = true;
    if (file.includes('node_modules')) hasNodeModules = true;
    if (file.includes('dev.db')) hasDbFile = true;
  });

  if (hasEnvFile) {
    console.log('❌ UYARI: .env dosyası bulundu! Lütfen kontrol edin.');
  } else {
    console.log('✅ .env dosyası yok (güvenli)');
  }

  if (hasNodeModules) {
    console.log('❌ UYARI: node_modules klasörü bulundu! Lütfen kontrol edin.');
  } else {
    console.log('✅ node_modules klasörü yok (güvenli)');
  }

  if (hasDbFile) {
    console.log('❌ UYARI: Database dosyası bulundu! Lütfen kontrol edin.');
  } else {
    console.log('✅ Database dosyası yok (güvenli)');
  }

  console.log('\n✨ Hazırlama tamamlandı!');
  console.log(`📦 Klasör: ${TARGET_DIR}`);
  console.log('\n📋 Sonraki adımlar:');
  console.log('1. telif-basvurusu klasörünü kontrol et');
  console.log('2. ZIP dosyası oluştur');
  console.log('3. ZIP içeriğini tekrar kontrol et');
  console.log('4. Telif başvurusunu gönder');
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Script'i çalıştır
main();

