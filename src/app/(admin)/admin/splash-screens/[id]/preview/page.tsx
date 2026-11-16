import { notFound } from "next/navigation";
import { getSplashScreen } from "@/server/splash-screens/repository";
import { WelcomeView } from "@/features/splash-screens/components/welcome-view";
import { getWelcomeBranding } from "@/server/splash-screens/branding";

export const instant = false;

export default async function SplashPreview({ params }: { params: Promise<{ id: string }> }) {
  const splash = await getSplashScreen((await params).id);
  if (!splash) notFound();
  return <WelcomeView splash={splash} branding={await getWelcomeBranding()} preview/>;
}
