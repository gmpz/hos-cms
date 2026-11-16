import { NextResponse } from "next/server";
import type { BlockConfigMap } from "@/features/pages/blocks/config/types";
import { listPublicNewsTabPosts } from "@/server/posts/repository";

type Tab = BlockConfigMap["newsTabs"]["tabs"][number];

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const categoryId = params.get("category") || null;
  const sourceKind = params.get("source") ?? "all";
  const unitId = params.get("unit") ?? "";
  if (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId))
    return NextResponse.json({ error: "หมวดหมู่ไม่ถูกต้อง" }, { status: 400 });
  let source: Tab["source"];
  if (sourceKind === "all" || sourceKind === "hospital") source = { kind: sourceKind };
  else if (sourceKind === "unit" && /^[a-zA-Z0-9_-]{1,100}$/.test(unitId)) source = { kind: "unit", unitId };
  else return NextResponse.json({ error: "หน่วยงานไม่ถูกต้อง" }, { status: 400 });

  const items = await listPublicNewsTabPosts({ id: "", label: "", source, categoryId });
  return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
}
