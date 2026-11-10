export function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    if (url.hostname === "maps.app.goo.gl") return url.pathname.length > 1;
    if (url.hostname === "goo.gl") return url.pathname.startsWith("/maps/");
    if (url.hostname === "maps.google.com") return true;
    return (url.hostname === "google.com" || url.hostname === "www.google.com") && url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}
