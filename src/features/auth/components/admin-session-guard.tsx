"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { changePasswordPath, safeReturnTo } from "@/features/auth/return-to";

/** Session checks supplement server authorization; they never grant access. */
export function AdminSessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const checkRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    const controller = new AbortController();
    let pending: Promise<void> | null = null;
    let redirecting = false;

    function check(): Promise<void> {
      if (pending) return pending;
      if (controller.signal.aborted || redirecting) return Promise.resolve();
      pending = (async () => {
        try {
          const response = await originalFetch("/api/auth/session", {
            cache: "no-store", signal: controller.signal,
          });
          // A network/server failure is not evidence that the session expired.
          if (!response.ok) return;
          const session: unknown = await response.json();
          if (!session || typeof session !== "object" || !("authenticated" in session)
            || typeof session.authenticated !== "boolean" || !("user" in session)) return;
          const user = session.user;
          const returnTo = safeReturnTo(window.location.pathname + window.location.search + window.location.hash);
          let destination: string | null = null;
          if (user === null && !session.authenticated) {
            destination = `/login?error=session-expired&returnTo=${encodeURIComponent(returnTo)}`;
          } else if (user && typeof user === "object") {
            if ("mustChangePassword" in user && user.mustChangePassword === true) destination = changePasswordPath(returnTo);
            else if ("role" in user && user.role !== "ADMIN") destination = "/";
          }
          if (destination && !controller.signal.aborted) {
            redirecting = true;
            setLeaving(true);
            // A full navigation discards cached admin UI and client stores.
            window.location.replace(destination);
          }
        } catch {
          // Leave connectivity errors to the existing request UI.
        } finally {
          pending = null;
        }
      })();
      return pending;
    }

    // Scoped to the mounted admin shell, including existing API clients and
    // Server Action requests. Verify ambiguous legacy 401/403 responses first.
    const adminFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      if (url.origin === window.location.origin
        && (response.status === 401 || response.status === 403 || !["GET", "HEAD", "OPTIONS"].includes(method))) await check();
      return response;
    };
    window.fetch = adminFetch;
    checkRef.current = check;
    const onFocus = () => { void check(); };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 30_000);
    void check();
    return () => {
      controller.abort();
      checkRef.current = null;
      if (window.fetch === adminFetch) window.fetch = originalFetch;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => { void checkRef.current?.(); }, [pathname]);
  return leaving ? null : children;
}
