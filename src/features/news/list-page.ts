import type { DemoPost } from "@/features/pages/demo/data";

export type PostListPage = {
  items: DemoPost[];
  page: number;
  pageSize: number;
  total: number;
  years: number[];
  selectedYear: number | null;
  categoryCounts: Record<string, number>;
  trashTotal: number;
};

export async function fetchPostListPage(
  audience: "admin" | "public",
  filters: Record<string, string | number | boolean>,
  signal: AbortSignal,
): Promise<PostListPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) params.set(key, String(value));
  const response = await fetch(`/api/posts/${audience}-list?${params}`, { cache: "no-store", signal });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error : "โหลดข่าวไม่สำเร็จ";
    throw new Error(message);
  }
  if (typeof payload !== "object" || payload === null || !("items" in payload) || !Array.isArray(payload.items) ||
    !("total" in payload) || typeof payload.total !== "number") throw new Error("ข้อมูลข่าวไม่ถูกต้อง");
  return payload as PostListPage;
}
