function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Canonicalizes the former single-banner and slider blocks into bannerSlider v9.
 * The legacy hero type remains readable at the type boundary until old snapshots
 * have all been saved again, but it is no longer created by the builder.
 */
export function migrateBannerBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!isRecord(block) || !isRecord(block.config)) return block;

    if (block.type === "hero" && block.version === 3) {
      return {
        ...block,
        type: "bannerSlider",
        version: 9,
        config: {
          mode: "single",
          slides: [
            {
              id: `${String(block.id)}-slide`,
              title: block.config.title,
              description: block.config.description,
              imageId: block.config.imageId,
              focalPoint: block.config.focalPoint,
              zoom: 100,
              imageInteraction: block.config.imageInteraction,
              action: block.config.action,
            },
          ],
          autoplay: false,
          intervalSeconds: 5,
          height: block.config.height,
          presentation: block.config.presentation,
          contentPosition: block.config.contentPosition,
        },
      } as T;
    }

    if (block.type === "bannerSlider" && block.version === 7) {
      return {
        ...block,
        version: 9,
        config: {
          ...block.config,
          mode: "slider",
          slides: Array.isArray(block.config.slides)
            ? block.config.slides.map((slide) =>
                isRecord(slide) ? { ...slide, zoom: 100 } : slide,
              )
            : block.config.slides,
        },
      } as T;
    }

    if (block.type === "bannerSlider" && block.version === 8) {
      return {
        ...block,
        version: 9,
        config: {
          ...block.config,
          slides: Array.isArray(block.config.slides)
            ? block.config.slides.map((slide) =>
                isRecord(slide) ? { ...slide, zoom: 100 } : slide,
              )
            : block.config.slides,
        },
      } as T;
    }

    return block;
  });
}
