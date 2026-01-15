import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { sanitizeFileName } from "@/lib/file-validation";

type StoredFile = {
  url: string;
  fileName: string;
  provider: "blob" | "local";
};

function createFileName(originalName: string, prefix: string) {
  const safeName = sanitizeFileName(originalName || "file");
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}-${safeName}`;
}

export async function storeFile(file: File, folder: string, prefix: string): Promise<StoredFile> {
  const fileName = createFileName(file.name, prefix);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${fileName}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return { url: blob.url, fileName, provider: "blob" };
  }

  const uploadDir = join(process.cwd(), "public", folder);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  return { url: `/${folder}/${fileName}`, fileName, provider: "local" };
}

export async function storeBuffer(
  buffer: Buffer,
  fileName: string,
  folder: string
): Promise<StoredFile> {
  const safeName = sanitizeFileName(fileName);
  const finalName = safeName || `file-${Date.now()}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${finalName}`, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return { url: blob.url, fileName: finalName, provider: "blob" };
  }

  const uploadDir = join(process.cwd(), "public", folder);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filePath = join(uploadDir, finalName);
  await writeFile(filePath, buffer);

  return { url: `/${folder}/${finalName}`, fileName: finalName, provider: "local" };
}
