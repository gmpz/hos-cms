import type { CSSProperties, ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { PublicAnnouncementEntry } from "@/components/public/public-announcement-entry";
import { PublicShellClient } from "@/components/public/public-shell-client";
import { getSiteSettings } from "@/server/site-settings/repository";
import type { SiteSettings } from "@/features/site-settings/types";
import { listActivePublicAnnouncements } from "@/server/announcements/repository";
import { getPublicLinkTargetCatalog } from "@/server/navigation/link-target-catalog";
import { currentUser } from "@/server/auth/session";
import { getNavigation, publicNavigation } from "@/server/navigation/repository";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { listPosts } from "@/server/posts/repository";
import { listUnits } from "@/server/units/repository";
import { listPublicCategoryCatalog } from "@/server/categories/repository";
import { visiblePublicAnnouncements } from "@/features/announcements/public-visibility";
import { attachResolvedMedia } from "@/server/media/resolve-references";

export async function getCachedPublicSiteSettings() {
  "use cache";
  cacheLife("max");
  cacheTag("site-settings");
  return getSiteSettings();
}

export async function PublicShell({ children, initialSettings }: { children: ReactNode; initialSettings?: SiteSettings }) {
  const [settings, announcements, linkTargetCatalog, navigationRecord, user, initialPosts, initialCategories] = await Promise.all([
    initialSettings ? Promise.resolve(initialSettings) : getCachedPublicSiteSettings(),
    listActivePublicAnnouncements(),
    getPublicLinkTargetCatalog(),
    getNavigation(),
    currentUser(),
    listPosts(false),
    listPublicCategoryCatalog(),
  ]);
  const authenticated = Boolean(user && !user.mustChangePassword);
  const cookieStore = await cookies();
  const visibleAnnouncements = visiblePublicAnnouncements(announcements, (name) => cookieStore.get(name)?.value);
  const initialUnits = await listUnits(false, user);
  const initialMedia = await listPublicMediaItemsByIds(collectMediaIds([settings, visibleAnnouncements, initialUnits]));
  const themeStyle = {
    "--primary": settings.theme.primary,
    "--secondary": settings.theme.secondary,
    "--accent": settings.theme.accent,
    "--emergency": settings.theme.emergency,
    "--ink": settings.theme.text,
    "--background": settings.theme.background,
    "--foreground": settings.theme.text,
  } as CSSProperties;
  return <>
  <PublicAnnouncementEntry announcements={visibleAnnouncements} themeStyle={themeStyle} />
  <PublicShellClient
    initialSettings={attachResolvedMedia(settings, initialMedia)}
    initialNavigation={publicNavigation(navigationRecord.navigation, authenticated)}
    initialNavigationAuthenticated={authenticated}
    initialUser={authenticated ? user : null}
    initialPosts={initialPosts}
    initialUnits={attachResolvedMedia(initialUnits, initialMedia)}
    initialCategories={initialCategories}
    linkTargetCatalog={linkTargetCatalog}
  >{children}</PublicShellClient>
  </>;
}
