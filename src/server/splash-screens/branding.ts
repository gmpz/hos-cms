import "server-only";

import { getSiteSettings } from "@/server/site-settings/repository";
import { getPublicMediaUrl } from "@/server/media/repository";
import { foregroundFor } from "@/features/site-settings/theme-contrast";

export async function getWelcomeBranding() {
  const settings = await getSiteSettings();
  const logoUrl = await getPublicMediaUrl(settings.logoMediaId);
  return {
    name: settings.name,
    englishName: settings.englishName,
    logoUrl: logoUrl ?? "/hospital-logo.png",
    logoFocusX: settings.logoFocusX,
    logoFocusY: settings.logoFocusY,
    logoZoom: settings.logoZoom,
    primary: settings.theme.primary,
    onPrimary: foregroundFor(settings.theme.primary),
    surface: settings.theme.background,
    onSurface: settings.theme.text,
    accent: settings.theme.accent,
  };
}
