function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Upgrade gallery snapshots sequentially; v6 adds a semantic heading size. */
export function migrateGalleryBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "gallery" || !record(block.config))
      return block;
    const versionTwo =
      block.version === 1
        ? {
            ...block,
            version: 2,
            config: {
              ...block.config,
              title: "",
              titleAlign: "left",
            },
          }
        : block;
    const versionThree =
      versionTwo.version === 2 && record(versionTwo.config)
        ? {
            ...versionTwo,
            version: 3,
            config: { ...versionTwo.config, description: "" },
          }
        : versionTwo;
    const versionFour =
      versionThree.version === 3 && record(versionThree.config)
        ? {
            ...versionThree,
            version: 4,
            config: { ...versionThree.config, layout: "grid" },
          }
        : versionThree;
    const versionFive = versionFour.version === 4 && record(versionFour.config)
      ? {
          ...versionFour,
          version: 5,
          config: {
            ...versionFour.config,
            autoplay: false,
            intervalSeconds: 5,
          },
        }
      : versionFour;
    if (versionFive.version !== 5 || !record(versionFive.config)) return versionFive as T;
    return {
      ...versionFive,
      version: 6,
      config: { ...versionFive.config, headingSize: "standard" },
    } as T;
  });
}
