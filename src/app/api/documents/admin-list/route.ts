import { DocumentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listDocumentPage } from "@/server/documents/repository";

const statuses = new Map([
  ["draft", DocumentStatus.DRAFT],
  ["published", DocumentStatus.PUBLISHED],
  ["archived", DocumentStatus.ARCHIVED],
]);

export async function GET(request: Request) {
  const user = await currentUser();
  if (user?.role !== "ADMIN" || user.mustChangePassword)
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเอกสาร" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const pageText = params.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(pageText) || !Number.isSafeInteger(Number(pageText)))
    return NextResponse.json({ error: "เลขหน้าไม่ถูกต้อง" }, { status: 400 });
  const statusText = params.get("status") ?? "all";
  if (statusText !== "all" && !statuses.has(statusText))
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  const search = params.get("search") ?? "";
  if (search.length > 200) return NextResponse.json({ error: "คำค้นหายาวเกินไป" }, { status: 400 });
  const categoryId = params.get("category") ?? "all";
  if (categoryId !== "all" && !/^[0-9a-f-]{36}$/i.test(categoryId))
    return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  const fiscalYearText = params.get("year") ?? "all";
  if (fiscalYearText !== "all" && (!/^\d{4}$/.test(fiscalYearText) || Number(fiscalYearText) < 2400 || Number(fiscalYearText) > 2800))
    return NextResponse.json({ error: "ปีงบประมาณไม่ถูกต้อง" }, { status: 400 });
  const result = await listDocumentPage({
    page: Number(pageText),
    pageSize: 10,
    search,
    categoryId: categoryId === "all" ? null : categoryId,
    status: statuses.get(statusText) ?? null,
    fiscalYear: fiscalYearText === "all" ? null : Number(fiscalYearText),
    trash: params.get("trash") === "1",
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
