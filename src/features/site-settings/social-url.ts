export type SocialNetwork = "facebook" | "youtube" | "line";

const allowedHosts: Record<SocialNetwork, readonly string[]> = {
  facebook: ["facebook.com", "www.facebook.com", "m.facebook.com", "fb.com", "www.fb.com", "fb.me"],
  youtube: ["youtube.com", "www.youtube.com", "m.youtube.com"],
  line: ["line.me", "www.line.me", "page.line.me", "lin.ee"],
};

export function isSocialUrl(value: string, network: SocialNetwork): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && !url.port
      && allowedHosts[network].includes(url.hostname.toLowerCase())
      && (url.pathname !== "/" || url.searchParams.has("id"));
  } catch {
    return false;
  }
}
