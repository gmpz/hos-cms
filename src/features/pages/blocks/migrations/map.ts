function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Replace the separate embed/open URLs with one shareable Google Maps URL. */
export function migrateMapBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!isRecord(block) || block.type !== "map" || block.version !== 1 || !isRecord(block.config))
      return block;
    const url = typeof block.config.externalUrl === "string" && block.config.externalUrl
      ? block.config.externalUrl
      : typeof block.config.embedUrl === "string"
        ? block.config.embedUrl
        : "";
    const { embedUrl: _embedUrl, externalUrl: _externalUrl, ...config } = block.config;
    void _embedUrl;
    void _externalUrl;
    return { ...block, version: 2, config: { ...config, url } } as T;
  });
}
