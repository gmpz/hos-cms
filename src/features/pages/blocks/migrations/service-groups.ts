function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const legacyIcons: Record<string, string> = {
  medical: "heart-pulse",
  document: "file-text",
  people: "users",
  knowledge: "book-open",
  digital: "globe",
  contact: "contact",
};

function migrateIcon(group: unknown): unknown {
  if (!record(group)) return group;
  return { ...group, icon: legacyIcons[String(group.icon)] ?? group.icon };
}

/** Adds semantic accents, a plain-text description and the shared navigation icon catalog. */
export function migrateServiceGroupBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "serviceGroups" || !record(block.config)) return block;
    if (block.version === 1 && Array.isArray(block.config.groups)) {
      return {
        ...block,
        version: 4,
        config: {
          ...block.config,
          description: "",
          groups: block.config.groups.map((group) => migrateIcon(record(group) ? { ...group, accent: "primary" } : group)),
        },
      };
    }
    if (block.version === 2) {
      return { ...block, version: 4, config: { ...block.config, description: "", groups: Array.isArray(block.config.groups) ? block.config.groups.map(migrateIcon) : block.config.groups } };
    }
    if (block.version === 3) {
      return { ...block, version: 4, config: { ...block.config, groups: Array.isArray(block.config.groups) ? block.config.groups.map(migrateIcon) : block.config.groups } };
    }
    return block;
  });
}
