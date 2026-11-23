import { NextResponse } from "next/server";
import type { BlockConfigMap } from "@/features/pages/blocks/config/types";
import { listPublicPostBlockPage } from "@/server/posts/repository";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pageText = params.get("page") ?? "1";
  const limitText = params.get("limit") ?? "6";
  const categoryId = params.get("category") || null;
  const kind = params.get("source") ?? "all";
  const unitId = params.get("unit") ?? "";
  if (!/^[1-9]\d*$/.test(pageText) || !Number.isSafeInteger(Number(pageText)) ||
    !/^[1-9]\d*$/.test(limitText) || Number(limitText) > 24 ||
    (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId)) ||
    !["all", "hospital", "unit"].includes(kind) ||
    (kind === "unit" && !/^[a-zA-Z0-9_-]{1,100}$/.test(unitId)))
    return NextResponse.json({ error: "ตัวกรองข่าวไม่ถูกต้อง" }, { status: 400 });
  const source: BlockConfigMap["posts"]["source"] = kind === "unit"
    ? { kind: "unit", unitId }
    : kind === "hospital" ? { kind: "hospital" } : { kind: "all" };
  const result = await listPublicPostBlockPage({
    page: Number(pageText), pageSize: Number(limitText), source, categoryId,
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
