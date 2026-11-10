export const navigationIconNames = [
  "house", "newspaper", "building2", "file-text", "folder-open", "contact", "search", "info", "circle-help", "menu",
  "calendar-days", "megaphone", "bell", "images", "image", "video", "download", "link", "globe", "map-pin",
  "phone", "mail", "users", "user-round", "heart-pulse", "hospital", "stethoscope", "activity", "shield-check", "clipboard-list",
  "book-open", "graduation-cap", "briefcase-business", "handshake", "chart-no-axes-column", "settings", "clock3", "star", "external-link", "file-down",
] as const;

export type NavigationIconName = (typeof navigationIconNames)[number];

export function isNavigationIconName(value: unknown): value is NavigationIconName {
  return typeof value === "string" && (navigationIconNames as readonly string[]).includes(value);
}
