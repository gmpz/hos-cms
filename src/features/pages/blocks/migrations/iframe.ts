function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Adds the visible description while preserving existing iframe titles. */
export function migrateIframeBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "iframe" || block.version !== 1 || !record(block.config)) return block;
    return { ...block, version: 2, config: { ...block.config, description: "" } };
  });
}
