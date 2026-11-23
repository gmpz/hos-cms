import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listAdminCmsPagePage } from "@/server/pages/repository";

export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูหน้าเว็บไซต์" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("size") ?? "10");
  const search = params.get("search") ?? "";
  const status = params.get("status") ?? "all";
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 || search.length > 100 || !["all", "published", "draft", "trash"].includes(status))
    return NextResponse.json({ error: "ตัวกรองหน้าเว็บไซต์ไม่ถูกต้อง" }, { status: 400 });
  return NextResponse.json(await listAdminCmsPagePage({ page, pageSize, search, status: status as "all" | "published" | "draft" | "trash" }), { headers: { "Cache-Control": "private, no-store" } });
}
