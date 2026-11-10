function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Migrates the legacy free-form CTA URL to the shared typed link target. */
export function migrateCtaBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (
      !record(block) ||
      block.type !== "cta" ||
      block.version !== 1 ||
      !record(block.config)
    )
      return block;

    const url = typeof block.config.url === "string" ? block.config.url : "/";
    return {
      ...block,
      version: 2,
      config: {
        ...block.config,
        target:
          url === "/"
            ? { kind: "module", module: "home" }
            : { kind: "external", url },
        url: undefined,
      },
    } as T;
  });
}
