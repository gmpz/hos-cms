import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { incrementPostViews } from "@/server/posts/repository";

const VIEW_WINDOW_SECONDS = 24 * 60 * 60;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const slug = typeof body === "object" && body !== null && "slug" in body ? body.slug : null;
  if (typeof slug !== "string" || slug.length > 191)
    return NextResponse.json({ error: "URL ข่าวไม่ถูกต้อง" }, { status: 400 });
  const cookieName = `news_view_${createHash("sha256").update(slug).digest("hex").slice(0, 20)}`;
  const alreadyViewed = request.headers.get("cookie")?.split(";").some((cookie) => cookie.trim() === `${cookieName}=1`) ?? false;
  const count = await incrementPostViews(slug, alreadyViewed);
  if (count === null) return NextResponse.json({ error: "ไม่พบข่าว" }, { status: 404 });
  const response = NextResponse.json({ count });
  if (!alreadyViewed) response.cookies.set(cookieName, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/posts/views", maxAge: VIEW_WINDOW_SECONDS });
  return response;
}
