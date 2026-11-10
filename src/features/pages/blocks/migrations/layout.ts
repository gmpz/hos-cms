import {
  normalizeBlockPosition,
  type BlockPosition,
  type BlockWidth,
} from "../config/layout";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Add shared semantic presentation options to blocks saved before they existed. */
export function migrateBlockLayout<T>(blocks: T[]): T[] {
  return blocks.map((block) => {
    if (!record(block)) return block;
    const width = ["narrow", "standard", "wide", "full"].includes(
      String(block.width),
    )
      ? block.width
      : "standard";
    const headingAccent = ["none", "primary", "secondary", "accent"].includes(
      String(block.headingAccent),
    )
      ? block.headingAccent
      : "none";
    const spacingTop = ["none", "small", "standard", "large"].includes(
      String(block.spacingTop),
    )
      ? block.spacingTop
      : "standard";
    const spacingBottom = ["none", "small", "standard", "large"].includes(
      String(block.spacingBottom),
    )
      ? block.spacingBottom
      : "standard";
    const legacyConfig = record(block.config) ? block.config : null;
    const legacyAlign = legacyConfig && typeof legacyConfig.align === "string"
      ? legacyConfig.align
      : null;
    const positionOptions = [
      "center", "left-standard", "left-wide", "left-full",
      "right-standard", "right-wide", "right-full",
    ];
    const storedPosition = positionOptions.includes(String(block.position))
      ? block.position
      : block.type === "table" && legacyAlign && positionOptions.includes(legacyAlign)
        ? legacyAlign
        : "center";
    const position = normalizeBlockPosition(
      width as BlockWidth,
      storedPosition as BlockPosition,
    );
    const legacyHeadingAlign = legacyConfig && typeof legacyConfig.titleAlign === "string"
      ? legacyConfig.titleAlign
      : legacyAlign?.startsWith("left")
        ? "left"
        : legacyAlign?.startsWith("right")
          ? "right"
          : legacyAlign === "center"
            ? "center"
            : "left";
    const headingAlign = ["left", "center", "right"].includes(String(block.headingAlign))
      ? block.headingAlign
      : legacyHeadingAlign;
    return { ...block, width, headingAccent, spacingTop, spacingBottom, position, headingAlign } as T;
  });
}
