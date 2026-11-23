import { NextResponse } from "next/server";
import { getPublishedPostTitleBySlug } from "@/server/posts/repository";

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!slug || slug.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(slug))
    return NextResponse.json({ error: "URL ข่าวไม่ถูกต้อง" }, { status: 400 });
  const title = await getPublishedPostTitleBySlug(slug);
  if (!title) return NextResponse.json({ error: "ไม่พบข่าว" }, { status: 404 });
  return NextResponse.json({ title }, { headers: { "Cache-Control": "no-store" } });
}
