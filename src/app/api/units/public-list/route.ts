import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { listPublicUnitPage } from "@/server/units/repository";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = params.get("page") ?? "1";
  const search = params.get("search") ?? "";
  if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page)) || search.length > 100)
    return NextResponse.json({ error: "ตัวกรองหน่วยงานไม่ถูกต้อง" }, { status: 400 });
  const result = await listPublicUnitPage({ page: Number(page), pageSize: 20, search }, await currentUser());
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
