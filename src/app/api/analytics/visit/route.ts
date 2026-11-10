import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/server/auth/session";
import { recordSiteVisit, visitCookieName, visitTimeoutSeconds } from "@/server/analytics/site-visits";

const excludedPaths = /^\/(?:admin|api|login|profile|change-password|_next|uploads)(?:\/|$)/;
const botUserAgents = /bot|crawler|spider|headless|lighthouse|curl|wget|preview|facebookexternalhit/i;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return new NextResponse(null, { status: 403 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || botUserAgents.test(userAgent)) return new NextResponse(null, { status: 204 });
  if ((await currentUser())?.role === "ADMIN") return new NextResponse(null, { status: 204 });

  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || !("path" in body) || typeof body.path !== "string")
    return NextResponse.json({ error: "หน้าเว็บไซต์ไม่ถูกต้อง" }, { status: 400 });
  const path = body.path;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#") || path.length > 300 || excludedPaths.test(path))
    return new NextResponse(null, { status: 204 });

  const source = "source" in body && ["direct", "search", "social", "other"].includes(String(body.source)) ? String(body.source) : "direct";
  const device = /tablet|ipad/i.test(userAgent) ? "tablet" : /mobile|iphone|android/i.test(userAgent) ? "mobile" : "desktop";
  const visit = await recordSiteVisit({ token: request.cookies.get(visitCookieName)?.value ?? null, landingPath: path, source, device });
  const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  response.cookies.set(visitCookieName, visit.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/", maxAge: visitTimeoutSeconds,
  });
  return response;
}
