function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Adds an explicit click behavior without changing how existing media behaves. */
export function migrateMediaInteractionBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!isRecord(block) || !isRecord(block.config)) return block;
    if (block.type === "hero" && block.version === 2) {
      return {
        ...block,
        version: 3,
        config: { ...block.config, imageInteraction: { kind: "none" } },
      } as T;
    }
    if (
      block.type === "bannerSlider" &&
      block.version === 6 &&
      Array.isArray(block.config.slides)
    ) {
      return {
        ...block,
        version: 7,
        config: {
          ...block.config,
          slides: block.config.slides.map((slide) =>
            isRecord(slide)
              ? { ...slide, imageInteraction: { kind: "none" } }
              : slide,
          ),
        },
      } as T;
    }
    if (block.type === "image" && block.version === 4) {
      return {
        ...block,
        version: 5,
        config: { ...block.config, imageInteraction: { kind: "none" } },
      } as T;
    }
    return block;
  });
}
