const bcrypt = require("bcryptjs");

// Admin şifresini hash'le
async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 12);
  return hash;
}

// Kullanım
const password = process.argv[2] || "admin123";

hashPassword(password).then((hash) => {
  console.log("\n🔐 Admin Şifre Hash'i:");
  console.log("─".repeat(60));
  console.log(`Düz Metin Şifre: ${password}`);
  console.log(`Hash'lenmiş:     ${hash}`);
  console.log("─".repeat(60));
  console.log("\n📝 .env dosyanıza ekleyin:");
  console.log(`ADMIN_PASSWORDS="${hash}"`);
  console.log("\n⚠️  NOT: Bu hash'i .env dosyanıza kopyalayın!");
  console.log("");
});

