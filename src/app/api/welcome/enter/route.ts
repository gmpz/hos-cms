import { NextRequest, NextResponse } from "next/server";
import { getActiveSplashScreen } from "@/server/splash-screens/repository";
import { splashCookieName } from "@/features/splash-screens/visibility";

export async function POST(request: NextRequest) {
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.slice(0, -1);
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const origin = `${protocol}://${host}`;
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.get("origin") && request.headers.get("origin") !== origin)) return new NextResponse(null, { status: 403 });
  const form = await request.formData();
  const splash = await getActiveSplashScreen();
  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store");
  if (!splash || form.get("id") !== splash.id) return response;
  const options = { httpOnly: true, secure: protocol === "https", sameSite: "lax" as const, path: "/" };
  if (splash.splashFrequency === "ALWAYS") response.cookies.set("hos-welcome-bypass", splash.id, { ...options, maxAge: 60 });
  else response.cookies.set(splashCookieName(splash), `${splash.splashCookieVersion}:${Date.now()}`, {
    ...options, ...(splash.splashFrequency === "SESSION" ? {} : { maxAge: splash.splashFrequency === "INTERVAL" ? splash.splashIntervalHours * 3600 : 2 * 365 * 24 * 3600 }),
  });
  return response;
}
