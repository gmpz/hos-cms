function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Upgrade the original single-source documents block into the unified tab model. */
export function migrateDocumentBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "documents" || !record(block.config)) return block;
    const version2 = block.version === 1
      ? (() => {
          const categoryId = typeof block.config.categoryId === "string" ? block.config.categoryId : null;
          return {
            ...block,
            version: 2,
            config: {
              title: "เอกสารเผยแพร่",
              description: "ดาวน์โหลดแบบฟอร์ม คู่มือ และเอกสารสำคัญ",
              tabs: [{ id: `${String(block.id)}-tab-1`, label: categoryId ? "เอกสารในหมวดหมู่" : "เอกสารทั้งหมด", source: categoryId ? { kind: "category", categoryId } : { kind: "all" } }],
              limit: Number(block.config.limit) || 6,
            },
          };
        })()
      : block;
    const version3 = version2.version === 2 && record(version2.config)
      ? {
          ...version2,
          version: 3,
          config: { ...version2.config, layout: "cards" },
        }
      : version2;
    const version4 = version3.version === 3 && record(version3.config) ? {
      ...version3,
      version: 4,
      config: {
        ...version3.config,
        tabs: Array.isArray(version3.config.tabs)
          ? version3.config.tabs.slice(0, 6)
          : [],
      },
    } : version3;
    if (version4.version !== 4 || !record(version4.config)) return version4 as T;
    return {
      ...version4,
      version: 5,
      config: {
        ...version4.config,
        tabs: Array.isArray(version4.config.tabs)
          ? version4.config.tabs.map((tab) => {
              if (!record(tab) || !record(tab.source)) return tab;
              return {
                ...tab,
                source: tab.source.kind === "selected" && Array.isArray(tab.source.documentIds)
                  ? { kind: "selected", documentIds: tab.source.documentIds.filter((id): id is string => typeof id === "string").slice(0, 30) }
                  : { kind: "all" },
                categoryId: tab.source.kind === "category" && typeof tab.source.categoryId === "string"
                  ? tab.source.categoryId
                  : null,
              };
            })
          : [],
      },
    } as T;
  });
}
