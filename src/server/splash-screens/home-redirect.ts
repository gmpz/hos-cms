import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getActiveSplashScreen } from "@/server/splash-screens/repository";
import { shouldShowSplash, splashCookieName } from "@/features/splash-screens/visibility";

export async function redirectHomeToWelcomeIfNeeded() {
  const splash = await getActiveSplashScreen();
  if (!splash) return;

  const requestHeaders = await headers();
  const crawler = /googlebot|bingbot|duckduckbot|baiduspider|yandexbot|slurp/i.test(requestHeaders.get("user-agent") ?? "");
  if (crawler || requestHeaders.get("x-hos-welcome-bypass") === splash.id) return;

  const cookieStore = await cookies();
  await connection();
  if (shouldShowSplash(splash, cookieStore.get(splashCookieName(splash))?.value)) redirect("/welcome");
}
