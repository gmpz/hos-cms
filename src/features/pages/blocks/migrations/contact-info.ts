type LegacyContactInfoBlock = {
  type?: unknown;
  version?: unknown;
  config?: unknown;
};

/** Add a separately stored optional phone extension to contact blocks. */
export function migrateContactInfoBlocks<T>(blocks: T[]): T[] {
  return blocks.map((entry) => {
    const block = entry as LegacyContactInfoBlock;
    if (block.type !== "contactInfo" || block.version !== 1 || !block.config || typeof block.config !== "object" || Array.isArray(block.config)) return entry;
    return {
      ...block,
      version: 2,
      config: {
        ...(block.config as Record<string, unknown>),
        internalPhone: "",
      },
    } as T;
  });
}
