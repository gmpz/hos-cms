import { PostStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listPostPage } from "@/server/posts/repository";

export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข่าว" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const page = params.get("page") ?? "1";
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "all";
  const unit = params.get("unit") ?? "all";
  const year = params.get("year") ?? "all";
  const status = params.get("status") ?? "all";
  if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)) || search.length > 200 ||
    (category !== "all" && !/^[0-9a-f-]{36}$/i.test(category)) ||
    (unit !== "all" && (unit.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(unit))) ||
    (year !== "all" && (!/^\d{4}$/.test(year) || Number(year) < 2400 || Number(year) > 2800)) ||
    !["all", "draft", "published"].includes(status))
    return NextResponse.json({ error: "ตัวกรองข่าวไม่ถูกต้อง" }, { status: 400 });
  const result = await listPostPage({
    page: Number(page), pageSize: 10, search,
    categoryId: category === "all" ? null : category,
    unitId: unit === "all" ? null : unit,
    year: year === "all" ? null : Number(year),
    status: status === "published" ? PostStatus.PUBLISHED : status === "draft" ? PostStatus.DRAFT : null,
    trash: params.get("trash") === "1",
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
