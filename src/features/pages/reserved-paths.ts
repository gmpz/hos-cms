export const reservedPageRoots = new Set([
  "admin",
  "api",
  "news",
  "units",
  "documents",
  "search",
  "welcome",
  "login",
  "change-password",
  "profile",
  "privacy-policy",
  "cookie-policy",
]);

export function isReservedPagePath(path: string) {
  return reservedPageRoots.has(path.split("/")[0] ?? "");
}
