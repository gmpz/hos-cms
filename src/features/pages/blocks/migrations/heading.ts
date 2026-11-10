type UnknownBlock = {
  type?: unknown;
  version?: unknown;
  config?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migrateHeadingBlocks<T>(blocks: T[]): T[] {
  return blocks.map((value) => {
    const block = value as UnknownBlock;
    if (block.type !== "heading" || block.version !== 1 || !isRecord(block.config)) {
      return value;
    }

    return {
      ...block,
      version: 2,
      config: { ...block.config, description: "" },
    } as T;
  });
}
