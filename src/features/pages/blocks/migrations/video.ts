function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Video v3 adds video-only and video-with-text presentation settings. */
export function migrateVideoBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "video" || !record(block.config)) return block;
    if (block.version !== 1 && block.version !== 2) return block;
    return {
      ...block,
      version: 3,
      config: {
        ...block.config,
        description: typeof block.config.description === "string" ? block.config.description : "",
        headingSize: typeof block.config.headingSize === "string" ? block.config.headingSize : "standard",
        mode: "video",
        videoTextSplit: "50-50",
        videoPosition: "left",
        verticalAlign: "center",
      },
    } as T;
  });
}
