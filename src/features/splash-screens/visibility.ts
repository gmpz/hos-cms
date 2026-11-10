import type { AnnouncementDto } from "@/features/announcements/types";

type Splash = Pick<AnnouncementDto, "id" | "splashFrequency" | "splashIntervalHours" | "splashCookieVersion">;

export function splashCookieName(item: Splash) {
  return `hos-welcome-${item.id}-${item.splashFrequency}`;
}

export function shouldShowSplash(item: Splash, cookie: string | undefined, now = Date.now()) {
  if (item.splashFrequency === "ALWAYS") return true;
  if (!cookie) return true;
  const [version, timestamp] = cookie.split(":");
  if (version !== String(item.splashCookieVersion)) return true;
  if (item.splashFrequency !== "INTERVAL") return false;
  const seenAt = Number(timestamp);
  return !Number.isSafeInteger(seenAt) || seenAt > now || now - seenAt >= item.splashIntervalHours * 60 * 60 * 1000;
}
