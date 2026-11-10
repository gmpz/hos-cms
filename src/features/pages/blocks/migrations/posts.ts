export function migratePostBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((block) => {
    if (typeof block !== "object" || block === null || Array.isArray(block))
      return block;
    const value = block as Record<string, unknown>;
    if (
      value.type !== "posts" ||
      typeof value.config !== "object" ||
      value.config === null ||
      Array.isArray(value.config)
    )
      return block;
    const version2 =
      value.version === 1
        ? {
            ...value,
            version: 2,
            config: {
              ...(value.config as Record<string, unknown>),
              categoryId: null,
            },
          }
        : value;
    const version3 =
      version2.version === 2 &&
      typeof version2.config === "object" &&
      version2.config !== null &&
      !Array.isArray(version2.config)
        ? {
            ...version2,
            version: 3,
            config: {
              ...(version2.config as Record<string, unknown>),
              title: "ข่าวและผลงาน",
              layout: "grid",
              showViewAll: true,
            },
          }
        : version2;
    if (
      version3.version !== 3 ||
      typeof version3.config !== "object" ||
      version3.config === null ||
      Array.isArray(version3.config)
    )
      return version3;
    return {
      ...version3,
      version: 4,
      config: {
        ...version3.config,
        description: "",
      },
    };
  });
}
