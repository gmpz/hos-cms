export function recordDocumentAccess(id: string, action: "open" | "download") {
  void fetch(`/api/documents/${encodeURIComponent(id)}/access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    keepalive: true,
  }).catch(() => undefined);
}

export function documentIdFromFileUrl(href: string): string | null {
  const match = /^\/api\/documents\/([0-9a-f-]{36})\/file\//i.exec(href);
  return match?.[1] ?? null;
}
