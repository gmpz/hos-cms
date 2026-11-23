function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const legacyIcons: Record<string, string> = {
  medical: "stethoscope",
  calendar: "calendar-days",
  document: "file-text",
  people: "users",
  phone: "phone",
  location: "map-pin",
};

/** v2 merged quick links; v3 shared icons; v4 adds image focus and zoom. */
export function migrateLinkCardsBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!isRecord(block) || !isRecord(block.config)) return block;
    if (block.type === "links" && block.version === 1) {
      const items = Array.isArray(block.config.items) ? block.config.items : [];
      return {
        ...block,
        type: "linkCards",
        version: 4,
        config: {
          title: "",
          description: "",
          presentation: "list",
          columns: 4,
          items: items.map((item, index) => isRecord(item) ? {
            id: `legacy-link-${String(block.id)}-${index}`,
            title: typeof item.label === "string" ? item.label : "ลิงก์",
            description: "",
            visual: { kind: "icon", icon: "file-text" },
            target: item.target,
          } : item),
        },
      } as T;
    }
    if (block.type === "linkCards" && (block.version === 1 || block.version === 2 || block.version === 3)) {
      const items = Array.isArray(block.config.items) ? block.config.items : [];
      return {
        ...block,
        version: 4,
        config: {
          ...block.config,
          presentation: block.version === 1 ? "cards" : block.config.presentation,
          items: items.map((item) => {
            if (!isRecord(item) || !isRecord(item.visual)) return item;
            if (item.visual.kind === "image") {
              return {
                ...item,
                visual: {
                  ...item.visual,
                  focalPoint: isRecord(item.visual.focalPoint) ? item.visual.focalPoint : { x: 50, y: 50 },
                  zoom: typeof item.visual.zoom === "number" ? item.visual.zoom : 100,
                },
              };
            }
            if (item.visual.kind !== "icon") return item;
            return {
              ...item,
              visual: {
                ...item.visual,
                icon: legacyIcons[String(item.visual.icon)] ?? "link",
              },
            };
          }),
        },
      } as T;
    }
    return block;
  });
}
