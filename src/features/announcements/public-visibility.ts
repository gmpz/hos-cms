import type { PublicAnnouncement } from "@/features/announcements/types";

export function seenCookieName(item: PublicAnnouncement) {
  return `hos-public-${item.displayMode.toLowerCase()}-${item.id}`;
}

export function shouldShowPublicAnnouncement(item: PublicAnnouncement, cookie: string | undefined, now = Date.now()) {
  if (!cookie) return true;
  const [version, timestamp] = cookie.split(":");
  if (version !== String(item.modalCookieVersion)) return true;
  if (timestamp === "never") return false;
  if (item.modalFrequency === "ALWAYS") return true;
  if (item.modalFrequency !== "INTERVAL") return false;
  // Legacy cookies contain only the version; respect their original expiry during migration.
  if (timestamp === undefined) return false;
  const seenAt = Number(timestamp);
  return !Number.isSafeInteger(seenAt) || seenAt > now || now - seenAt >= item.modalIntervalHours * 60 * 60 * 1000;
}

export function visiblePublicAnnouncements(
  announcements: PublicAnnouncement[],
  getCookie: (name: string) => string | undefined,
) {
  return announcements.filter((item) => shouldShowPublicAnnouncement(item, getCookie(seenCookieName(item))));
}
