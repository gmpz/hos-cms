type UnknownBlock = {
  type?: unknown;
  version?: unknown;
  config?: unknown;
};

/** Consolidate the retired Spacer block into Divider's semantic space style. */
export function migrateDividerBlocks<T>(blocks: T[]): T[] {
  return blocks.map((value) => {
    const block = value as UnknownBlock;
    if (block.type !== "spacer" || block.version !== 1) return value;

    return {
      ...block,
      type: "divider",
      version: 1,
      config: { style: "space" },
    } as T;
  });
}
