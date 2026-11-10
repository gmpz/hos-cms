import "server-only";

import { MediaKind } from "@prisma/client";
import type { UploadedMediaItem } from "@/features/media/upload-media-file";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

export async function listPublicMediaItems(): Promise<UploadedMediaItem[]> {
  const items = await prisma.mediaAsset.findMany({
    orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
  });
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind === MediaKind.IMAGE ? "image" : "document",
    mimeType: item.mimeType,
    size: item.sizeBytes,
    alt: item.alt,
    uploadedAt: item.uploadedAt.toISOString(),
    previewUrl: mediaPublicUrl(item.fileName),
  }));
}

export async function getPublicMediaUrl(id: string | null): Promise<string | null> {
  if (!id) return null;
  const item = await prisma.mediaAsset.findUnique({ where: { id }, select: { fileName: true } });
  return item ? mediaPublicUrl(item.fileName) : null;
}
