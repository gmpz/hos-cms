import { SplashScreensManager } from "@/features/splash-screens/components/splash-screens-manager";
import { listSplashScreens } from "@/server/splash-screens/repository";

export const instant = false;

export default async function SplashScreensPage() {
  return <SplashScreensManager initialItems={await listSplashScreens()}/>;
}
