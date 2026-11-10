function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** PDF Viewer v2 adds placement; v3 removes the obsolete open/download control. */
export function migratePdfViewerBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block) || block.type !== "pdfViewer" || !record(block.config)) return block;
    const versionTwo = block.version === 1
      ? { ...block, version: 2, config: { ...block.config, align: "center" } }
      : block;
    if (versionTwo.version !== 2 || !record(versionTwo.config)) return versionTwo as T;
    const config = { ...versionTwo.config };
    delete config.showDownload;
    return { ...versionTwo, version: 3, config } as T;
  });
}
