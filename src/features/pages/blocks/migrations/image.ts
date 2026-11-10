export function migrateImageBlocks<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!isRecord(block) || !isRecord(block.config)) return block;
    if (block.type === "imageText") {
      const action = isRecord(block.config.action)
        ? { ...block.config.action, openInNewTab: typeof block.config.action.openInNewTab === "boolean" ? block.config.action.openInNewTab : false }
        : null;
      return {
        ...block,
        type: "image",
        version: 10,
        config: {
          mode: "imageText",
          title: typeof block.config.title === "string" ? block.config.title : "",
          description: typeof block.config.body === "string" ? block.config.body : "",
          titleAlign: "left",
          mediaId: typeof block.config.imageId === "string" ? block.config.imageId : null,
          alt: typeof block.config.title === "string" ? block.config.title : "",
          caption: "",
          imageSize: "full",
          imageAlign: "center",
          imageTextDisplay: "natural",
          imageTextSplit: "50-50",
          aspectRatio: "original",
          fit: "cover",
          focalPoint: { x: 50, y: 50 },
          zoom: 100,
          imageInteraction: { kind: "none" },
          imagePosition: block.config.imagePosition === "right" ? "right" : "left",
          verticalAlign: ["top", "center", "bottom"].includes(String(block.config.verticalAlign)) ? block.config.verticalAlign : "center",
          action,
        },
      } as T;
    }
    if (block.type !== "image") return block;
    return {
      ...block,
      version: 10,
      config: {
        mode: block.config.mode === "imageText" ? "imageText" : "image",
        title: typeof block.config.title === "string" ? block.config.title : "",
        description: typeof block.config.description === "string"
          ? (block.config.mode === "imageText" ? block.config.description : toPlainText(block.config.description))
          : "",
        titleAlign: ["left", "center", "right"].includes(String(block.config.titleAlign)) ? block.config.titleAlign : "left",
        mediaId: typeof block.config.mediaId === "string" ? block.config.mediaId : null,
        alt: typeof block.config.alt === "string" ? block.config.alt : "",
        caption: typeof block.config.caption === "string" ? block.config.caption : "",
        imageSize: ["small", "medium", "large", "full"].includes(String(block.config.imageSize)) ? block.config.imageSize : "full",
        imageAlign: ["left", "center", "right"].includes(String(block.config.imageAlign)) ? block.config.imageAlign : "center",
        imageTextDisplay: block.config.imageTextDisplay === "crop" ? "crop" : "natural",
        imageTextSplit: ["40-60", "50-50", "60-40"].includes(String(block.config.imageTextSplit)) ? block.config.imageTextSplit : "50-50",
        aspectRatio: ["original", "16:9", "4:3", "1:1", "4:5", "a4"].includes(String(block.config.aspectRatio)) ? block.config.aspectRatio : "original",
        fit: block.config.fit === "cover" ? "cover" : "contain",
        focalPoint: isRecord(block.config.focalPoint) ? block.config.focalPoint : { x: 50, y: 50 },
        zoom: typeof block.config.zoom === "number" && block.config.zoom >= 100 && block.config.zoom <= 300 ? block.config.zoom : 100,
        imageInteraction: isRecord(block.config.imageInteraction) ? block.config.imageInteraction : { kind: "none" },
        imagePosition: block.config.imagePosition === "right" ? "right" : "left",
        verticalAlign: ["top", "center", "bottom"].includes(String(block.config.verticalAlign)) ? block.config.verticalAlign : "center",
        action: isRecord(block.config.action) ? block.config.action : null,
      },
    } as T;
  });
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

function toPlainText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .trim();
}
