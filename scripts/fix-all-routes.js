const fs = require('fs');
const path = require('path');

// Tüm route.ts dosyalarını bul
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Route dosyasını düzelt
function fixRouteFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Zaten dynamic export varsa atla
  if (content.includes('export const dynamic')) {
    return false;
  }
  
  // export async function veya export const handler bul
  const hasExport = content.match(/export\s+(async\s+function|const\s+handler)/);
  if (!hasExport) {
    return false;
  }
  
  // İlk export'tan önceki satırı bul
  const firstExportMatch = content.match(/export\s+(async\s+function|const\s+handler|const\s+\w+)/);
  if (!firstExportMatch) {
    return false;
  }
  
  const insertPosition = firstExportMatch.index;
  
  // Dynamic export ekle
  const dynamicExport = "export const dynamic = 'force-dynamic';\nexport const runtime = 'nodejs';\n\n";
  
  // Insert position'dan önceki satırın sonuna bak
  let beforeInsert = content.slice(0, insertPosition);
  if (!beforeInsert.endsWith('\n\n')) {
    if (!beforeInsert.endsWith('\n')) {
      beforeInsert += '\n';
    }
    beforeInsert += '\n';
  }
  
  content = beforeInsert + dynamicExport + content.slice(insertPosition);
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// Ana işlem
const apiDir = path.join(__dirname, '..', 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Toplam ${routeFiles.length} route dosyası bulundu.`);

let fixedCount = 0;
routeFiles.forEach(file => {
  if (fixRouteFile(file)) {
    fixedCount++;
    console.log(`✓ Düzeltildi: ${file}`);
  }
});

console.log(`\n${fixedCount} dosya düzeltildi.`);

