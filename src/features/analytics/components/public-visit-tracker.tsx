"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

let lastTrackedPath = "";
let lastTrackedAt = 0;
let hasTrackedThisDocument = false;

function sourceFromReferrer() {
  if (hasTrackedThisDocument || !document.referrer) return "direct";
  try {
    const referrer = new URL(document.referrer);
    if (referrer.hostname === window.location.hostname) return "direct";
    if (/(^|\.)(google|bing|duckduckgo|yahoo)\./i.test(referrer.hostname)) return "search";
    if (/(^|\.)(facebook|instagram|line|youtube|tiktok|x|twitter)\./i.test(referrer.hostname)) return "social";
    return "other";
  } catch { return "direct"; }
}

export function PublicVisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (/^\/(?:login|profile|change-password|admin|api)(?:\/|$)/.test(pathname)) return;
    const track = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (pathname === lastTrackedPath && now - lastTrackedAt < 2000) return;
      lastTrackedPath = pathname;
      lastTrackedAt = now;
      const source = sourceFromReferrer();
      hasTrackedThisDocument = true;
      void fetch("/api/analytics/visit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, source }), credentials: "same-origin", keepalive: true,
      }).then((response) => {
        if (response.ok) window.dispatchEvent(new Event("hos-visit-recorded"));
      }).catch(() => undefined);
    };
    track();
    document.addEventListener("visibilitychange", track);
    return () => document.removeEventListener("visibilitychange", track);
  }, [pathname]);
  return null;
}
