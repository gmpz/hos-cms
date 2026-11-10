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
    if (url.protocol !== "https:" || !allowedHosts.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
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
      const response = await fetch(sourceUrl, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const candidate = parseAllowedUrl(response.url);
      if (candidate) resolvedUrl = candidate;
    } catch {
      return Response.json({ message: "ไม่สามารถเปิดลิงก์ Google Maps นี้ได้" }, { status: 422 });
    }
  }

  const embedUrl = createEmbedUrl(resolvedUrl);
  if (!embedUrl)
    return Response.json({ message: "ไม่พบตำแหน่งจากลิงก์ Google Maps" }, { status: 422 });
  return Response.json(
    { embedUrl, externalUrl: resolvedUrl.toString() },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
