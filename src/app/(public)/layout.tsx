import { Suspense } from "react";
import { headers } from "next/headers";
import { PublicInitialLoading } from "@/components/public/public-page-loading";
import { getCachedPublicSiteSettings, PublicShell } from "@/components/public/public-shell";
import { redirectHomeToWelcomeIfNeeded } from "@/server/splash-screens/home-redirect";
import type { SiteSettings } from "@/features/site-settings/types";

async function PublicShellAfterWelcomeCheck({ children, settings }: { children: React.ReactNode; settings: SiteSettings }) {
  if ((await headers()).get("x-hos-home-request") === "1") await redirectHomeToWelcomeIfNeeded();
  return <PublicShell initialSettings={settings}>{children}</PublicShell>;
}

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const settings = await getCachedPublicSiteSettings();

  return (
    <Suspense fallback={<PublicInitialLoading theme={settings.theme} />}>
      <PublicShellAfterWelcomeCheck settings={settings}>{children}</PublicShellAfterWelcomeCheck>
    </Suspense>
  );
}
