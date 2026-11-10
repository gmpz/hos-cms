export function migrateTableBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (
      !isRecord(block) ||
      block.type !== "table" ||
      !isRecord(block.config)
    )
      return block;
    const version2 = block.version === 1
      ? { ...block, version: 2, config: { ...block.config, align: "center" } }
      : block;
    const version3 = version2.version === 2 && isRecord(version2.config) ? {
      ...version2,
      version: 3,
      config: {
        ...version2.config,
        align:
          String(version2.config.align) === "left"
            ? "left-standard"
            : String(version2.config.align) === "right"
              ? "right-standard"
              : "center",
      },
    } : version2;
    const version4 = version3.version === 3 && isRecord(version3.config) ? {
      ...version3,
      version: 4,
      config: { ...version3.config, description: "" },
    } : version3;
    if (version4.version !== 4 || !isRecord(version4.config)) return version4 as T;
    return {
      ...version4,
      version: 5,
      config: { ...version4.config, columnWidths: [] },
    } as T;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
