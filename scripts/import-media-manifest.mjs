import { PrismaClient } from "@prisma/client";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const configuredUploadDirectory = process.env.MEDIA_STORAGE_DIRECTORY?.trim();
if (configuredUploadDirectory && !path.isAbsolute(configuredUploadDirectory)) throw new Error("MEDIA_STORAGE_DIRECTORY must be an absolute path");
const uploadDirectory = configuredUploadDirectory ? path.resolve(configuredUploadDirectory) : path.join(process.cwd(), "public", "uploads");
const manifestPath = path.join(process.cwd(), ".data", "media-manifest.json");
const mimeByExtension = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp4: "video/mp4",
};

async function main() {
  const raw = await readFile(manifestPath, "utf8").catch(() => "[]");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("media-manifest.json ต้องเป็นรายการ");
  const manifest = new Map(parsed.filter((item) => item && typeof item.fileName === "string" && /^[\w.-]+$/.test(item.fileName)).map((item) => [item.fileName, item]));
  const files = await readdir(uploadDirectory, { withFileTypes: true });
  let imported = 0;
  for (const file of files) {
    if (!file.isFile() || file.name === ".gitkeep" || !/^[\w.-]+$/.test(file.name)) continue;
    const extension = path.extname(file.name).slice(1).toLowerCase();
    const saved = manifest.get(file.name);
    const mimeType = typeof saved?.mimeType === "string" ? saved.mimeType : mimeByExtension[extension];
    if (!mimeType) continue;
    const details = await stat(path.join(uploadDirectory, file.name));
    const id = typeof saved?.id === "string" && saved.id.length <= 191 ? saved.id : `upload:${file.name}`;
    const name = typeof saved?.originalName === "string" ? saved.originalName : file.name;
    const uploadedAt = typeof saved?.uploadedAt === "string" && !Number.isNaN(Date.parse(saved.uploadedAt)) ? new Date(saved.uploadedAt) : details.mtime;
    if (await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } })) continue;
    await prisma.mediaAsset.create({ data: {
      id,
      name: name.slice(0, 255),
      kind: mimeType.startsWith("image/") ? "IMAGE" : "DOCUMENT",
      mimeType,
      sizeBytes: details.size,
      alt: name.replace(/\.[^.]+$/, "").slice(0, 500),
      fileName: file.name,
      uploadedAt,
    } });
    imported += 1;
  }
  process.stdout.write(`Imported ${imported} media records; original files and manifest were not changed.\n`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
