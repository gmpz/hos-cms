type UploadResponse = {
  id?: unknown;
  url?: unknown;
  message?: unknown;
};

export type UploadedMediaItem = {
  id: string;
  name: string;
  kind: "image" | "document";
  mimeType: string;
  size: number;
  alt: string;
  uploadedAt: string;
  previewUrl: string;
};

export type MediaLibraryPage = {
  items: UploadedMediaItem[];
  total: number;
  page: number;
  summary: { image: { count: number; bytes: number }; document: { count: number; bytes: number } };
};

type UploadOptions = {
  signal?: AbortSignal;
  onProgress?: (percent: number | null) => void;
  onTransferComplete?: () => void;
};

export function uploadMediaFile(file: File, mediaId?: string, options: UploadOptions = {}): Promise<{ id: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (mediaId) formData.append("mediaId", mediaId);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const finish = () => options.signal?.removeEventListener("abort", abort);

    request.upload.addEventListener("progress", (event) => {
      options.onProgress?.(event.lengthComputable && event.total > 0
        ? Math.min(100, Math.round(event.loaded / event.total * 100)) : null);
    });
    request.upload.addEventListener("load", () => options.onTransferComplete?.());
    request.addEventListener("load", () => {
      finish();
      const result: UploadResponse | null = request.response && typeof request.response === "object" ? request.response as UploadResponse : null;
      if (request.status < 200 || request.status >= 300 || typeof result?.id !== "string" ||
        typeof result.url !== "string" || !result.url.startsWith("/uploads/")) {
        reject(new Error(typeof result?.message === "string" ? result.message : "อัปโหลดไฟล์ไม่สำเร็จ"));
        return;
      }
      resolve({ id: result.id, url: result.url });
    });
    request.addEventListener("error", () => { finish(); reject(new Error("เชื่อมต่อเพื่ออัปโหลดไฟล์ไม่สำเร็จ")); });
    request.addEventListener("abort", () => { finish(); reject(new DOMException("ยกเลิกการอัปโหลด", "AbortError")); });
    if (options.signal?.aborted) { reject(new DOMException("ยกเลิกการอัปโหลด", "AbortError")); return; }
    options.signal?.addEventListener("abort", abort, { once: true });
    request.open("POST", "/api/media/upload");
    request.responseType = "json";
    request.send(formData);
  });
}

export async function fetchUploadedMediaItems() {
  const response = await fetch("/api/media/upload", { cache: "no-store" });
  const result: unknown = await response.json();
  if (
    !response.ok ||
    typeof result !== "object" ||
    result === null ||
    !("items" in result) ||
    !Array.isArray(result.items)
  )
    throw new Error("อ่านไฟล์จากโฟลเดอร์ uploads ไม่สำเร็จ");
  return result.items as UploadedMediaItem[];
}

export async function fetchMediaLibraryPage(options: {
  page: number;
  kind: "all" | "image" | "document";
  search: string;
  signal?: AbortSignal;
}): Promise<MediaLibraryPage> {
  const params = new URLSearchParams({ library: "1", page: String(options.page), kind: options.kind, search: options.search });
  const response = await fetch(`/api/media/upload?${params}`, { cache: "no-store", signal: options.signal });
  const result: unknown = await response.json();
  if (!response.ok || typeof result !== "object" || result === null || !("items" in result) || !Array.isArray(result.items) ||
    !("total" in result) || typeof result.total !== "number" || !("page" in result) || typeof result.page !== "number" ||
    !("summary" in result) || typeof result.summary !== "object" || result.summary === null)
    throw new Error("โหลดรายการคลังสื่อไม่สำเร็จ");
  return result as MediaLibraryPage;
}

export async function fetchMediaPickerPage(options: {
  kind: "image" | "document" | "pdf";
  search: string;
  cursor: string | null;
  signal?: AbortSignal;
}): Promise<{ items: UploadedMediaItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams({ paged: "1", kind: options.kind, limit: "24", search: options.search });
  if (options.cursor) params.set("cursor", options.cursor);
  const response = await fetch(`/api/media/upload?${params}`, { cache: "no-store", signal: options.signal });
  const result: unknown = await response.json();
  if (!response.ok || typeof result !== "object" || result === null || !("items" in result) || !Array.isArray(result.items) ||
    !("nextCursor" in result) || (result.nextCursor !== null && typeof result.nextCursor !== "string"))
    throw new Error("โหลดไฟล์จากคลังสื่อไม่สำเร็จ");
  return result as { items: UploadedMediaItem[]; nextCursor: string | null };
}

export async function fetchMediaItemsByIds(ids: string[]): Promise<UploadedMediaItem[]> {
  const params = new URLSearchParams({ ids: ids.join(",") });
  const response = await fetch(`/api/media/upload?${params}`, { cache: "no-store" });
  const result: unknown = await response.json();
  if (!response.ok || typeof result !== "object" || result === null || !("items" in result) || !Array.isArray(result.items))
    throw new Error("โหลดข้อมูลไฟล์ไม่สำเร็จ");
  return result.items as UploadedMediaItem[];
}

