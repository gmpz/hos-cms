/** Upgrade structured document lists sequentially; v4 adds a heading size. */
export function migrateDocumentListBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (typeof block !== "object" || block === null || Array.isArray(block))
      return block;
    const value = block as Record<string, unknown>;
    if (
      value.type !== "documentList" ||
      typeof value.config !== "object" ||
      value.config === null ||
      Array.isArray(value.config)
    )
      return block;
    const config = value.config as Record<string, unknown>;
    const version2 =
      value.version === 1
        ? {
            ...value,
            version: 2,
            config: {
              ...config,
              items: Array.isArray(config.items)
                ? config.items.map((item) =>
                    typeof item === "object" &&
                    item !== null &&
                    !Array.isArray(item)
                      ? { ...(item as Record<string, unknown>), level: 1 }
                      : item,
                  )
                : [],
            },
          }
        : value;
    const version3 = version2.version === 2
      ? {
          ...version2,
          version: 3,
          config: {
            ...(version2.config as Record<string, unknown>),
            showIcons: true,
          },
        }
      : version2;
    if (version3.version !== 3) return version3 as T;
    return {
      ...version3,
      version: 4,
      config: {
        ...(version3.config as Record<string, unknown>),
        headingSize: "standard",
      },
    } as T;
  });
}
