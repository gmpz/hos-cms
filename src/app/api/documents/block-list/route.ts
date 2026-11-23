import { NextResponse } from "next/server";
import type { BlockConfigMap } from "@/features/pages/blocks/config/types";
import { listPublicDocumentBlockPage } from "@/server/documents/repository";

type Tab = BlockConfigMap["documents"]["tabs"][number];
const uuid = /^[0-9a-f-]{36}$/i;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "10";
  if (!/^[1-9]\d*$/.test(pageText) || !Number.isSafeInteger(Number(pageText)) ||
    !/^[1-9]\d*$/.test(limitText) || Number(limitText) > 20)
    return NextResponse.json({ error: "เลขหน้าหรือจำนวนรายการไม่ถูกต้อง" }, { status: 400 });
  const categoryId = params.get("category") || null;
  if (categoryId && !uuid.test(categoryId))
    return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  const yearText = params.get("year") ?? "all";
  if (yearText !== "all" &&
    (!/^\d{4}$/.test(yearText) || Number(yearText) < 2400 || Number(yearText) > 2800))
    return NextResponse.json({ error: "ปีงบประมาณไม่ถูกต้อง" }, { status: 400 });
  const fiscalYear: Tab["fiscalYear"] = yearText === "all" ? "all" : Number(yearText);
  const kind = params.get("source") ?? "all";
  let source: Tab["source"];
  if (kind === "all" || kind === "hospital") source = { kind };
  else if (kind === "unit") {
    const unitId = params.get("unit") ?? "";
    if (!unitId || unitId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(unitId))
      return NextResponse.json({ error: "หน่วยงานไม่ถูกต้อง" }, { status: 400 });
    source = { kind, unitId };
  } else if (kind === "selected") {
    const documentIds = params.getAll("id");
    if (documentIds.length > 30 || documentIds.some((id) => !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))
      return NextResponse.json({ error: "รายการเอกสารไม่ถูกต้อง" }, { status: 400 });
    source = { kind, documentIds };
  } else return NextResponse.json({ error: "เจ้าของเอกสารไม่ถูกต้อง" }, { status: 400 });
  const result = await listPublicDocumentBlockPage({
    page: Number(pageText), pageSize: Number(limitText),
    tab: { source, categoryId, fiscalYear },
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
