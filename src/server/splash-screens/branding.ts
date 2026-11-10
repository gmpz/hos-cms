import "server-only";

import { getSiteSettings } from "@/server/site-settings/repository";
import { getPublicMediaUrl } from "@/server/media/repository";

function foregroundFor(hex: string) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#101815" : "#FFFFFF";
}

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
