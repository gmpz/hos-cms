const allowedHosts = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
]);

function parseAllowedUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) ||
      url.username || url.password || (url.port && url.port !== "443")) return null;
    return url;
  } catch {
    return null;
  }
}

async function resolveShortUrl(sourceUrl: URL): Promise<URL> {
  const signal = AbortSignal.timeout(6000);
  const visited = new Set<string>();
  let current = sourceUrl;
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (visited.has(current.href)) throw new Error("Redirect loop");
    visited.add(current.href);
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    // Only headers are needed; do not download the destination page.
    await response.body?.cancel();
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      if (!response.ok) throw new Error("Maps request failed");
      return current;
    }
    const location = response.headers.get("location");
    if (!location || redirects === 5) throw new Error("Invalid redirect");
    const next = parseAllowedUrl(new URL(location, current).href);
    if (!next) throw new Error("Disallowed redirect destination");
    current = next;
  }
  throw new Error("Too many redirects");
}

function createEmbedUrl(url: URL) {
  if (url.pathname.includes("/maps/embed")) return url.toString();
  const coordinates = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const query = coordinates
    ? `${coordinates[1]},${coordinates[2]}`
    : url.searchParams.get("q") ??
      url.searchParams.get("query") ??
      url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/)?.[1]?.replaceAll("+", " ");
  return query
    ? `https://maps.google.com/maps?q=${encodeURIComponent(decodeURIComponent(query))}&z=16&output=embed`
    : null;
}

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url") ?? "";
  const sourceUrl = parseAllowedUrl(input);
  if (!sourceUrl)
    return Response.json({ message: "รองรับเฉพาะลิงก์ Google Maps แบบ HTTPS" }, { status: 400 });

  let resolvedUrl = sourceUrl;
  if (sourceUrl.hostname === "maps.app.goo.gl" || sourceUrl.hostname === "goo.gl") {
    try {
      resolvedUrl = await resolveShortUrl(sourceUrl);
    } catch {
      return Response.json({ message: "ไม่สามารถเปิดลิงก์ Google Maps นี้ได้" }, { status: 422 });
    }
  }

  let embedUrl: string | null;
  try { embedUrl = createEmbedUrl(resolvedUrl); }
  catch { embedUrl = null; }
  if (!embedUrl)
    return Response.json({ message: "ไม่พบตำแหน่งจากลิงก์ Google Maps" }, { status: 422 });
  return Response.json(
    { embedUrl, externalUrl: resolvedUrl.toString() },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
