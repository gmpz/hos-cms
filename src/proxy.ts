import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-hos-home-request", "1");
  headers.delete("x-hos-welcome-bypass");
  const bypass = request.cookies.get("hos-welcome-bypass")?.value;
  const prefetch = request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  if (!bypass || prefetch) return NextResponse.next({ request: { headers } });
  headers.set("x-hos-welcome-bypass", bypass);
  const response = NextResponse.next({ request: { headers } });
  response.cookies.delete("hos-welcome-bypass");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/" };
