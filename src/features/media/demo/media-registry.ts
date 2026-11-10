import type { DemoMediaItem } from "./media-items";
import { fetchMediaItemsByIds, fetchUploadedMediaItems, type UploadedMediaItem } from "../upload-media-file";

export const mediaChangeEvent = "hos-cms:demo:media-change";

export type MediaUsage = {
  kind: "page" | "post" | "unit" | "document" | "profile" | "site-settings" | "splash" | "announcement";
  id: string;
  title: string;
  location: string;
  href: string;
};

export class MediaInUseError extends Error {
  constructor(message: string, readonly usages: MediaUsage[]) { super(message); }
}

let items: DemoMediaItem[] = [];
let loaded = false;
let pending: Promise<void> | null = null;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(mediaChangeEvent));
}

export function toDemoMediaItem(row: UploadedMediaItem, index = 0): DemoMediaItem {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    mimeType: row.mimeType,
    size: formatBytes(row.size),
    sizeBytes: row.size,
    dimensions: row.kind === "image" ? "รูปภาพ" : "—",
    uploadedAt: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(row.uploadedAt)),
    uploadedBy: "ผู้ดูแลระบบ",
    alt: row.alt,
    previewUrl: row.previewUrl,
    tone: (index % 5) + 1,
  };
}

export function getDemoMediaItems(): DemoMediaItem[] {
  return items;
}

export function seedDemoMediaItems(rows: UploadedMediaItem[]): void {
  if (!Array.isArray(rows)) return;
  const known = new Set(items.map((item) => item.id));
  const additions = rows.filter((row) => !known.has(row.id)).map(toDemoMediaItem);
  if (additions.length) items = [...items, ...additions];
  loaded = true;
}

export function addUploadedMediaItem(item: DemoMediaItem): void {
  items = [item, ...items.filter((current) => current.id !== item.id)];
  notify();
}

export function getDemoMediaItem(id: string | null): DemoMediaItem | null {
  return id ? items.find((item) => item.id === id) ?? null : null;
}

export async function hydrateDemoMediaIds(ids: string[]): Promise<void> {
  const missing = [...new Set(ids)].filter((id) => id && !items.some((item) => item.id === id));
  if (!missing.length) return;
  const rows = await fetchMediaItemsByIds(missing.slice(0, 50));
  const known = new Set(items.map((item) => item.id));
  const additions = rows.filter((row) => !known.has(row.id)).map(toDemoMediaItem);
  if (additions.length) { items = [...items, ...additions]; notify(); }
}

export function hydrateDemoMedia(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (pending) return pending;
  if (loaded && !force) return Promise.resolve();
  pending = fetchUploadedMediaItems().then((rows) => {
    items = rows.map(toDemoMediaItem);
    loaded = true;
    notify();
  }).finally(() => { pending = null; });
  return pending;
}

export async function registerDemoMediaItem(item: DemoMediaItem) {
  const response = await fetch("/api/media/upload", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: item.id, name: item.name, alt: item.alt }),
  });
  if (!response.ok) throw new Error("บันทึกข้อมูลสื่อไม่สำเร็จ");
  items = items.some((current) => current.id === item.id)
    ? items.map((current) => current.id === item.id ? item : current)
    : [item, ...items];
  notify();
}

export async function removeDemoMediaItem(id: string) {
  const response = await fetch("/api/media/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
      ? payload.message : "ลบไฟล์ไม่สำเร็จ";
    if (response.status === 409 && typeof payload === "object" && payload !== null && "usages" in payload && Array.isArray(payload.usages)) {
      throw new MediaInUseError(message, payload.usages as MediaUsage[]);
    }
    throw new Error(message);
  }
  items = items.filter((item) => item.id !== id);
  notify();
}

export function subscribeDemoMedia(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onFocus = () => { void hydrateDemoMedia(true).catch(() => undefined); };
  window.addEventListener(mediaChangeEvent, callback);
  window.addEventListener("focus", onFocus);
  return () => {
    window.removeEventListener(mediaChangeEvent, callback);
    window.removeEventListener("focus", onFocus);
  };
}

export function mediaPreviewStyle(item: DemoMediaItem | null) {
  if (!item) return undefined;
  if (item.previewUrl) return { backgroundImage: `url(${item.previewUrl})` };
  const gradients = [
    "linear-gradient(145deg,#0b5b78,#5bc2b2)",
    "linear-gradient(145deg,#163e6d,#8ab5ce)",
    "linear-gradient(145deg,#763f78,#ed8c87)",
    "linear-gradient(145deg,#38684e,#9dc67d)",
    "linear-gradient(145deg,#7b5225,#e4b95d)",
  ];
  return { backgroundImage: gradients[(item.tone - 1) % gradients.length] };
}
