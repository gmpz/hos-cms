import { NextResponse } from "next/server";
import { listPublicDocumentPage } from "@/server/documents/repository";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pageText = params.get("page") ?? "1";
  if (!/^[1-9]\d*$/.test(pageText) || !Number.isSafeInteger(Number(pageText)))
    return NextResponse.json({ error: "เลขหน้าไม่ถูกต้อง" }, { status: 400 });
  const search = params.get("search") ?? "";
  if (search.length > 200) return NextResponse.json({ error: "คำค้นหายาวเกินไป" }, { status: 400 });
  const categoryId = params.get("category") ?? "all";
  if (categoryId !== "all" && !/^[0-9a-f-]{36}$/i.test(categoryId))
    return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  const unitId = params.get("unit") ?? "all";
  if (unitId !== "all" && (unitId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(unitId)))
    return NextResponse.json({ error: "หน่วยงานไม่ถูกต้อง" }, { status: 400 });
  const yearText = params.get("year") ?? "latest";
  if (yearText !== "all" && yearText !== "latest" && (!/^\d{4}$/.test(yearText) || Number(yearText) < 2400 || Number(yearText) > 2800))
    return NextResponse.json({ error: "ปีงบประมาณไม่ถูกต้อง" }, { status: 400 });
  const result = await listPublicDocumentPage({
    page: Number(pageText),
    pageSize: 20,
    search,
    categoryId: categoryId === "all" ? null : categoryId,
    unitId: unitId === "all" ? null : unitId,
    fiscalYear: yearText === "all" ? null : yearText === "latest" ? "latest" : Number(yearText),
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
