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

/** Normalizes legacy service groups to the fixed three-column layout. */
export function migrateServiceGroupBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "serviceGroups" || !record(block.config)) return block;
    if (block.version === 1 && Array.isArray(block.config.groups)) {
      return {
        ...block,
        version: 6,
        config: {
          ...block.config,
          columns: 3,
          description: "",
          groups: block.config.groups.map((group) => migrateIcon(record(group) ? { ...group, accent: "primary" } : group)),
        },
      };
    }
    if (block.version === 2) {
      return { ...block, version: 6, config: { ...block.config, columns: 3, description: "", groups: Array.isArray(block.config.groups) ? block.config.groups.map(migrateIcon) : block.config.groups } };
    }
    if (block.version === 3) {
      return { ...block, version: 6, config: { ...block.config, columns: 3, groups: Array.isArray(block.config.groups) ? block.config.groups.map(migrateIcon) : block.config.groups } };
    }
    if (block.version === 4 || block.version === 5) return { ...block, version: 6, config: { ...block.config, columns: 3 } };
    return block;
  });
}
