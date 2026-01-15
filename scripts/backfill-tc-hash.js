const { PrismaClient } = require("@prisma/client");
const { decryptTcKimlik, hashTcKimlik, normalizeTcKimlik } = require("../lib/encryption");

const prisma = new PrismaClient();

async function resolveTcValue(tcKimlikNo) {
  if (!tcKimlikNo) return "";
  try {
    const decrypted = decryptTcKimlik(tcKimlikNo);
    const normalized = normalizeTcKimlik(decrypted);
    if (normalized) return normalized;
  } catch (error) {
    // ignore
  }

  const normalized = normalizeTcKimlik(tcKimlikNo);
  return normalized || "";
}

async function main() {
  const doctorProfiles = await prisma.doctorProfile.findMany({
    select: { id: true, tcKimlikNo: true, tcKimlikNoHash: true },
  });

  const patientProfiles = await prisma.patientProfile.findMany({
    select: { id: true, tcKimlikNo: true, tcKimlikNoHash: true },
  });

  let doctorUpdated = 0;
  let patientUpdated = 0;

  for (const profile of doctorProfiles) {
    if (profile.tcKimlikNoHash) continue;
    const tcValue = await resolveTcValue(profile.tcKimlikNo);
    const tcHash = hashTcKimlik(tcValue);
    if (!tcHash) continue;

    await prisma.doctorProfile.update({
      where: { id: profile.id },
      data: { tcKimlikNoHash: tcHash },
    });
    doctorUpdated += 1;
  }

  for (const profile of patientProfiles) {
    if (profile.tcKimlikNoHash) continue;
    const tcValue = await resolveTcValue(profile.tcKimlikNo);
    const tcHash = hashTcKimlik(tcValue);
    if (!tcHash) continue;

    await prisma.patientProfile.update({
      where: { id: profile.id },
      data: { tcKimlikNoHash: tcHash },
    });
    patientUpdated += 1;
  }

  console.log(`Doctor profiles updated: ${doctorUpdated}`);
  console.log(`Patient profiles updated: ${patientUpdated}`);
}

main()
  .catch((error) => {
    console.error("Backfill error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
