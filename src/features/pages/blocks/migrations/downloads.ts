function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Downloads v2 adds a heading; v3 adds its semantic size. */
export function migrateDownloadsBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "downloads" || !record(block.config))
      return block;
    const version2 = block.version === 1
      ? { ...block, version: 2, config: { ...block.config, title: "" } }
      : block;
    if (version2.version !== 2) return version2 as T;
    const config = version2.config as Record<string, unknown>;
    const headingSize = ["small", "standard", "large"].includes(String(config.headingSize))
      ? config.headingSize
      : "standard";
    return { ...version2, version: 3, config: { ...config, headingSize } } as T;
  });
}
