import type { DemoDocument } from "./model";

export const documentsChangeEvent = "hos-documents-change";

export type DocumentPage = {
  items: DemoDocument[];
  page: number;
  pageSize: number;
  total: number;
  years: number[];
  counts: { active: number; published: number; draft: number; trash: number };
};

export type PublicDocumentPage = {
  items: DemoDocument[];
  page: number;
  pageSize: number;
  total: number;
  years: number[];
  selectedYear: number | null;
  categoryCounts: Record<string, number>;
};

let publicDocuments: DemoDocument[] = [];
let publicDocumentsLoaded = false;
let adminDocuments: DemoDocument[] = [];
let deletedDocuments: DemoDocument[] = [];

function isDocument(value: unknown): value is DemoDocument {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    "id" in value && typeof value.id === "string" &&
    "title" in value && typeof value.title === "string" &&
    "categoryId" in value && typeof value.categoryId === "string" &&
    "mediaIds" in value && Array.isArray(value.mediaIds) &&
    "openCount" in value && typeof value.openCount === "number" &&
    "downloadCount" in value && typeof value.downloadCount === "number";
}

export function readDocuments(includeDrafts = false): DemoDocument[] {
  return (includeDrafts ? adminDocuments : publicDocuments) ?? [];
}

export function seedPublicDocuments(documents: DemoDocument[]): void {
  if (!Array.isArray(documents)) return;
  publicDocuments = documents;
  publicDocumentsLoaded = true;
}

export function publicDocumentsAreLoaded(): boolean { return publicDocumentsLoaded; }

export function readDeletedDocuments(): DemoDocument[] { return deletedDocuments; }

export async function fetchAdminDocumentPage(options: { page: number; search: string; category: string; status: string; year: string; trash: boolean }, signal?: AbortSignal): Promise<DocumentPage> {
  const params = new URLSearchParams({ page: String(options.page), search: options.search, category: options.category, status: options.status, year: options.year });
  if (options.trash) params.set("trash", "1");
  const response = await fetch(`/api/documents/admin-list?${params}`, { cache: "no-store", signal });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "โหลดเอกสารไม่สำเร็จ");
  if (typeof payload !== "object" || payload === null || !("items" in payload) || !Array.isArray(payload.items) || !payload.items.every(isDocument) ||
    !("page" in payload) || typeof payload.page !== "number" || !("total" in payload) || typeof payload.total !== "number" ||
    !("pageSize" in payload) || typeof payload.pageSize !== "number" || !("years" in payload) || !Array.isArray(payload.years) || !payload.years.every((year) => typeof year === "number") || !("counts" in payload) || typeof payload.counts !== "object" || payload.counts === null)
    throw new Error("ข้อมูลรายการเอกสารไม่ถูกต้อง");
  const counts = payload.counts as Record<string, unknown>;
  if (typeof counts.active !== "number" || typeof counts.published !== "number" || typeof counts.draft !== "number" || typeof counts.trash !== "number")
    throw new Error("ข้อมูลจำนวนเอกสารไม่ถูกต้อง");
  return payload as DocumentPage;
}

export async function fetchPublicDocumentPage(options: { page: number; search: string; category: string; unit: string; year: string }, signal?: AbortSignal): Promise<PublicDocumentPage> {
  const params = new URLSearchParams({ page: String(options.page), search: options.search, category: options.category, unit: options.unit, year: options.year });
  const response = await fetch(`/api/documents/public-list?${params}`, { cache: "no-store", signal });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "โหลดเอกสารไม่สำเร็จ");
  if (typeof payload !== "object" || payload === null || !("items" in payload) || !Array.isArray(payload.items) || !payload.items.every(isDocument) ||
    !("page" in payload) || typeof payload.page !== "number" || !("total" in payload) || typeof payload.total !== "number" ||
    !("pageSize" in payload) || typeof payload.pageSize !== "number" || !("years" in payload) || !Array.isArray(payload.years) || !payload.years.every((year) => typeof year === "number") ||
    !("selectedYear" in payload) || (payload.selectedYear !== null && typeof payload.selectedYear !== "number") ||
    !("categoryCounts" in payload) || typeof payload.categoryCounts !== "object" || payload.categoryCounts === null)
    throw new Error("ข้อมูลรายการเอกสารไม่ถูกต้อง");
  return payload as PublicDocumentPage;
}

export async function refreshDeletedDocuments(): Promise<DemoDocument[]> {
  const response = await fetch("/api/documents?trash=1", { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดถังขยะไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isDocument)) throw new Error("ข้อมูลถังขยะไม่ถูกต้อง");
  deletedDocuments = payload;
  window.dispatchEvent(new Event(documentsChangeEvent));
  return payload;
}

export async function actOnDocument(document: DemoDocument, action: "unpublish" | "delete" | "restore"): Promise<void> {
  const response = await fetch(`/api/documents/${document.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json();
    throw new Error(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error : "จัดการเอกสารไม่สำเร็จ");
  }
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("document" in payload) || !isDocument(payload.document))
    throw new Error("ข้อมูลเอกสารที่แก้ไขไม่ถูกต้อง");
  const updated = payload.document;
  adminDocuments = action === "delete" ? adminDocuments.filter((item) => item.id !== document.id) : [updated, ...adminDocuments.filter((item) => item.id !== document.id)];
  deletedDocuments = action === "delete" ? [updated, ...deletedDocuments.filter((item) => item.id !== document.id)] : deletedDocuments.filter((item) => item.id !== document.id);
  publicDocuments = publicDocuments.filter((item) => item.id !== document.id);
  window.dispatchEvent(new Event(documentsChangeEvent));
}

export async function refreshDocuments(includeDrafts = false): Promise<DemoDocument[]> {
  const response = await fetch(`/api/documents${includeDrafts ? "?admin=1" : ""}`, { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดเอกสารไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isDocument)) throw new Error("ข้อมูลเอกสารไม่ถูกต้อง");
  if (includeDrafts) adminDocuments = payload;
  else { publicDocuments = payload; publicDocumentsLoaded = true; }
  window.dispatchEvent(new Event(documentsChangeEvent));
  return payload;
}

export async function saveDocument(document: DemoDocument): Promise<DemoDocument> {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(document),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error : "บันทึกเอกสารไม่สำเร็จ";
    throw new Error(message);
  }
  if (!isDocument(payload)) throw new Error("ข้อมูลเอกสารที่บันทึกไม่ถูกต้อง");
  adminDocuments = [payload, ...adminDocuments.filter((item) => item.id !== payload.id)];
  publicDocuments = payload.status === "published"
    ? [payload, ...publicDocuments.filter((item) => item.id !== payload.id)]
    : publicDocuments.filter((item) => item.id !== payload.id);
  window.dispatchEvent(new Event(documentsChangeEvent));
  return payload;
}
