import "server-only";

import type { UploadedMediaItem } from "@/features/media/upload-media-file";
import { collectMediaIds } from "@/features/media/media-references";
import { resolvedMediaField } from "@/features/media/resolved-media";
import { listPublicMediaItemsByIds } from "./repository";

const fields = new Set([
  "mediaId", "imageId", "coverMediaId", "logoMediaId", "imageMediaId",
  "photoMediaId", "profileMediaId", "backgroundMediaId",
]);
const assetFields = new Set([...fields].map((field) => resolvedMediaField(field as Parameters<typeof resolvedMediaField>[0])).concat("mediaAsset"));

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Add display metadata beside references, without changing the stored IDs. */
export function attachResolvedMedia<T>(value: T, media: UploadedMediaItem[]): T {
  const byId = new Map(media.map((item) => [item.id, item]));
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== "object") return node;
    if (!isPlainObject(node)) return node;
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(node)) {
      if (assetFields.has(key)) continue;
      result[key] = visit(child);
      if (fields.has(key) && typeof child === "string") {
        result[resolvedMediaField(key as Parameters<typeof resolvedMediaField>[0])] = byId.get(child) ?? null;
      }
      if (key === "href" && typeof child === "string" && child.startsWith("#media:")) {
        result.mediaAsset = byId.get(child.slice(7)) ?? null;
      }
    }
    return result;
  };
  return visit(value) as T;
}

export async function resolveMediaReferences<T>(value: T): Promise<T> {
  const media = await listPublicMediaItemsByIds(collectMediaIds(value));
  return attachResolvedMedia(value, media);
}

/** Keep display metadata out of persisted editor snapshots. */
export function stripResolvedMedia<T>(value: T): T {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== "object") return node;
    if (!isPlainObject(node)) return node;
    return Object.fromEntries(Object.entries(node).filter(([key]) => !assetFields.has(key)).map(([key, child]) => [key, visit(child)]));
  };
  return visit(value) as T;
}
