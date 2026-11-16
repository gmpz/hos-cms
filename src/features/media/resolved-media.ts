import type { UploadedMediaItem } from "./upload-media-file";
import { getDemoMediaItem, toDemoMediaItem } from "./demo/media-registry";

/** Display-only media metadata attached to the content that references it. */
export type ResolvedMedia = UploadedMediaItem;

type MediaField =
  | "mediaId" | "imageId" | "coverMediaId" | "logoMediaId"
  | "imageMediaId" | "photoMediaId" | "profileMediaId" | "backgroundMediaId";

export function resolvedMediaField(field: MediaField): string {
  return `${field.slice(0, -2)}Asset`;
}

/** Read an asset already attached to this content object by the server. */
export function mediaFor(value: unknown, field: MediaField = "mediaId"): ResolvedMedia | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const asset = (value as Record<string, unknown>)[resolvedMediaField(field)];
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
  const candidate = asset as Partial<ResolvedMedia>;
  const referencedId = (value as Record<string, unknown>)[field];
  if (referencedId === null) return null;
  return typeof candidate.previewUrl === "string" && typeof candidate.id === "string" &&
    (typeof referencedId !== "string" || candidate.id === referencedId)
    ? candidate as ResolvedMedia
    : null;
}

/** Prefer the URL delivered with the content. The fallback supports unsaved editor choices. */
export function displayMediaFor(value: unknown, field: MediaField = "mediaId") {
  const asset = mediaFor(value, field);
  if (asset) return toDemoMediaItem(asset);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = record[field];
  return typeof id === "string" ? getDemoMediaItem(id) : null;
}
