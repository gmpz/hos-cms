import type { CategoryScope, DemoCategory } from "../types";

export const categoriesChangedEvent = "hos-categories-change";

const categoryCache: Partial<Record<CategoryScope, DemoCategory[]>> = {};
function isCategory(value: unknown): value is DemoCategory {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.sortOrder === "number" && typeof item.active === "boolean";
}
export function readCategories(scope: CategoryScope): DemoCategory[] {
  return categoryCache[scope] ?? [];
}

export function seedCategories(scope: CategoryScope, items: DemoCategory[]): void {
  if (Array.isArray(items)) categoryCache[scope] = items;
}

export function setCategories(scope: CategoryScope, items: DemoCategory[]) {
  categoryCache[scope] = items;
  window.dispatchEvent(new CustomEvent(categoriesChangedEvent, { detail: { scope } }));
}

export async function refreshCategories(scope: CategoryScope): Promise<DemoCategory[]> {
  const response = await fetch(`/api/categories?scope=${scope}`, { cache: "no-store" });
  if (!response.ok) throw new Error("โหลดหมวดหมู่ไม่สำเร็จ");
  const payload: unknown = await response.json();
  if (!Array.isArray(payload) || !payload.every(isCategory)) throw new Error("ข้อมูลหมวดหมู่ไม่ถูกต้อง");
  const categories = payload.sort((a, b) => a.sortOrder - b.sortOrder);
  setCategories(scope, categories);
  return categories;
}
export function categoryIdFromLegacyName(scope: CategoryScope, name: string): string {
  return categoryCache[scope]?.find((item) => item.name === name)?.id ?? "";
}
export function categoryName(categories: DemoCategory[], id: string): string {
  return categories.find((item) => item.id === id)?.name ?? "ไม่ระบุหมวดหมู่";
}
