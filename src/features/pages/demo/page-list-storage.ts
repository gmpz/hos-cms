import type { DemoPageSummary } from "./pages";
export const pagesChangeEvent = "hos-pages-change";
let summaries: DemoPageSummary[] = [];

export function readPageSummaries(): DemoPageSummary[] {
  return summaries;
}

function updateSummaries(pages: DemoPageSummary[]) {
  summaries = pages;
  window.dispatchEvent(new Event(pagesChangeEvent));
}

async function responseData(response: Response): Promise<unknown> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "จัดการหน้าไม่สำเร็จ";
    throw new Error(message);
  }
  return data;
}

function isSummary(value: unknown): value is DemoPageSummary {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && "path" in value && typeof value.path === "string" && "revision" in value && typeof value.revision === "number";
}

export async function refreshPageSummaries(): Promise<DemoPageSummary[]> {
  const data = await responseData(await fetch("/api/pages", { cache: "no-store" }));
  if (!Array.isArray(data) || !data.every(isSummary)) throw new Error("ข้อมูลหน้าไม่ถูกต้อง");
  updateSummaries(data);
  return data;
}

export async function fetchDeletedPageSummaries(): Promise<DemoPageSummary[]> {
  const data = await responseData(await fetch("/api/pages?trash=true", { cache: "no-store" }));
  if (!Array.isArray(data) || !data.every(isSummary)) throw new Error("ข้อมูลหน้าที่ลบไม่ถูกต้อง");
  return data;
}

export async function refreshPublicPageSummaries(): Promise<DemoPageSummary[]> {
  const data = await responseData(await fetch("/api/pages/public", { cache: "no-store" }));
  if (!Array.isArray(data) || !data.every(isSummary)) throw new Error("ข้อมูลหน้าไม่ถูกต้อง");
  updateSummaries(data);
  return data;
}

export async function createPageSummary(name: string, path: string): Promise<DemoPageSummary> {
  const data = await responseData(await fetch("/api/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, path }) }));
  if (!isSummary(data)) throw new Error("ข้อมูลหน้าที่สร้างไม่ถูกต้อง");
  await refreshPageSummaries();
  return data;
}

export async function actOnPageSummary(id: string, action: "duplicate" | "unpublish" | "delete" | "restore" | "purge" | "metadata", revision: number, values?: { name: string; path: string }, skipListRefresh = false): Promise<void> {
  await responseData(await fetch(`/api/pages/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision, ...values }) }));
  if (!skipListRefresh) await refreshPageSummaries();
}
