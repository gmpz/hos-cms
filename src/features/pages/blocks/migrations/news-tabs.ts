function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** News tabs v5 caps the navigation at six tabs after v4 added owner filters. */
export function migrateNewsTabsBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "newsTabs" || !record(block.config)) return block;
    const versionTwo = block.version === 1
      ? (() => {
          const { limit: _legacyLimit, ...config } = block.config;
          void _legacyLimit;
          return { ...block, version: 2, config };
        })()
      : block;
    const versionThree = versionTwo.version === 2 && record(versionTwo.config)
      ? {
          ...versionTwo,
          version: 3,
          config: {
            ...versionTwo.config,
            description: toPlainText(versionTwo.config.description),
          },
        }
      : versionTwo;
    const versionFour = versionThree.version === 3 && record(versionThree.config)
      ? {
          ...versionThree,
          version: 4,
          config: {
            ...versionThree.config,
            tabs: Array.isArray(versionThree.config.tabs)
              ? versionThree.config.tabs.map((tab) => record(tab) ? { ...tab, source: { kind: "all" } } : tab)
              : versionThree.config.tabs,
          },
        }
      : versionThree;
    if (versionFour.version !== 4 || !record(versionFour.config)) return versionFour as T;
    return {
      ...versionFour,
      version: 5,
      config: {
        ...versionFour.config,
        tabs: Array.isArray(versionFour.config.tabs)
          ? versionFour.config.tabs.slice(0, 6)
          : versionFour.config.tabs,
      },
    } as T;
  });
}
