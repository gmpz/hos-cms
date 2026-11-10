import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getActiveSplashScreen } from "@/server/splash-screens/repository";
import { shouldShowSplash, splashCookieName } from "@/features/splash-screens/visibility";
import { WelcomeView } from "@/features/splash-screens/components/welcome-view";
import { getWelcomeBranding } from "@/server/splash-screens/branding";

export const metadata: Metadata = { title: "ยินดีต้อนรับ", robots: { index: false, follow: false } };
export const instant = false;

export default async function WelcomePage() {
  await connection();
  const splash = await getActiveSplashScreen();
  if (!splash || !shouldShowSplash(splash, (await cookies()).get(splashCookieName(splash))?.value)) redirect("/");
  return <WelcomeView splash={splash} branding={await getWelcomeBranding()}/>;
}
