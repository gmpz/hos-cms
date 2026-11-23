import { NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { getPublicUnitTitleBySlug } from "@/server/units/repository";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(slug))
    return NextResponse.json({ error: "URL หน่วยงานไม่ถูกต้อง" }, { status: 400 });
  const title = await getPublicUnitTitleBySlug(slug, await currentUser());
  if (!title) return NextResponse.json({ error: "ไม่พบหน่วยงาน" }, { status: 404 });
  return NextResponse.json({ title }, { headers: { "Cache-Control": "private, no-store" } });
}
