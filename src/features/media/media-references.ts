const mediaIdKeys = new Set([
  "mediaId", "mediaIds", "coverMediaId", "logoMediaId", "imageMediaId",
  "imageId", "photoMediaId", "profileMediaId", "backgroundMediaId",
]);

export function collectMediaIds(value: unknown): string[] {
  const ids = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      if (node.startsWith("#media:") && node.length > 7) ids.add(node.slice(7));
      return;
    }
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (mediaIdKeys.has(key)) {
        if (typeof child === "string" && child) ids.add(child);
        else if (Array.isArray(child)) child.forEach((id) => { if (typeof id === "string" && id) ids.add(id); });
      } else {
        visit(child);
      }
    }
  };
  visit(value);
  return [...ids];
}
