import { NextRequest, NextResponse } from "next/server";
import { seenCookieName } from "@/features/announcements/public-visibility";
import { listActivePublicAnnouncements } from "@/server/announcements/repository";

function requestOrigin(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.slice(0, -1);
  return `${protocol}://${host}`;
}

function returnUrl(request: NextRequest) {
  const origin = requestOrigin(request);
  const fallback = new URL("/", origin);
  const referrer = request.headers.get("referer");
  if (!referrer) return fallback;
  try {
    const url = new URL(referrer);
    if (url.origin === origin && !url.pathname.startsWith("/api/")) return url;
  } catch { /* Invalid referrer. */ }
  return fallback;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== requestOrigin(request)) || request.headers.get("sec-fetch-site") === "cross-site")
    return new NextResponse(null, { status: 403 });

  const form = await request.formData();
  const id = form.get("id");
  const version = form.get("version");
  const displayMode = form.get("displayMode");
  const suppress = form.get("suppress");
  if (typeof id !== "string" || typeof version !== "string" || displayMode !== "MODAL" ||
    (suppress !== null && suppress !== "1"))
    return new NextResponse(null, { status: 400 });

  const item = (await listActivePublicAnnouncements()).find((candidate) =>
    candidate.id === id && String(candidate.modalCookieVersion) === version && candidate.displayMode === displayMode,
  );
  const json = request.headers.get("accept")?.includes("application/json");
  if (!item) return json ? NextResponse.json({ error: "ประกาศเปลี่ยนไปแล้ว" }, { status: 409 }) : NextResponse.redirect(returnUrl(request), { status: 303 });
  const response = json ? NextResponse.json({ ok: true }) : NextResponse.redirect(returnUrl(request), { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  if (suppress === "1") response.cookies.set(seenCookieName(item), `${item.modalCookieVersion}:never`, {
    httpOnly: true,
    sameSite: "lax",
    secure: requestOrigin(request).startsWith("https://"),
    path: "/",
    maxAge: 2 * 365 * 24 * 60 * 60,
  });
  else if (item.modalFrequency === "ALWAYS") response.cookies.delete(seenCookieName(item));
  else response.cookies.set(seenCookieName(item), `${item.modalCookieVersion}:${Date.now()}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: requestOrigin(request).startsWith("https://"),
    path: "/",
    ...(item.modalFrequency === "SESSION" ? {} : {
      maxAge: item.modalFrequency === "INTERVAL" ? item.modalIntervalHours * 60 * 60 : 2 * 365 * 24 * 60 * 60,
    }),
  });
  response.cookies.delete("hos-public-modal-visit");
  return response;
}
