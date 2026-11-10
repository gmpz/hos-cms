function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}

const legacyIconMap: Record<string, string> = {
  bed: "hospital",
  location: "map-pin",
  people: "users",
  service: "activity",
  heart: "heart-pulse",
  hospital: "hospital",
  calendar: "calendar-days",
  clock: "clock3",
  phone: "phone",
  document: "file-text",
  medical: "stethoscope",
};

/** v2 expanded the icon set; v3 stores plain descriptions; v4 shares navigation icons. */
export function migrateStatisticsBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (
      !isRecord(block) ||
      block.type !== "statistics" ||
      !isRecord(block.config)
    )
      return block;
    const versionTwo = block.version === 1 ? { ...block, version: 2 } : block;
    const versionThree = versionTwo.version === 2 && isRecord(versionTwo.config) ? {
      ...versionTwo,
      version: 3,
      config: {
        ...versionTwo.config,
        description: toPlainText(versionTwo.config.description),
      },
    } : versionTwo;
    if (versionThree.version !== 3 || !isRecord(versionThree.config)) return versionThree as T;
    return {
      ...versionThree,
      version: 4,
      config: {
        ...versionThree.config,
        items: Array.isArray(versionThree.config.items)
          ? versionThree.config.items.map((item) => isRecord(item)
            ? { ...item, icon: legacyIconMap[String(item.icon)] ?? "activity" }
            : item)
          : versionThree.config.items,
      },
    } as T;
  });
}
