import type { PageBlock } from "./types";

export type BlockWidth = PageBlock["width"];
export type BlockPosition = PageBlock["position"];

const positionsByWidth = {
  full: ["center"],
  wide: ["left-full", "center", "right-full"],
  standard: [
    "left-wide",
    "left-full",
    "center",
    "right-wide",
    "right-full",
  ],
  narrow: [
    "left-standard",
    "left-wide",
    "left-full",
    "center",
    "right-standard",
    "right-wide",
    "right-full",
  ],
} as const satisfies Record<BlockWidth, readonly BlockPosition[]>;

export function blockPositionsForWidth(
  width: BlockWidth,
): readonly BlockPosition[] {
  return positionsByWidth[width];
}

/** Keep a saved position inside the alignment guides available at this width. */
export function normalizeBlockPosition(
  width: BlockWidth,
  position: BlockPosition,
): BlockPosition {
  const available = blockPositionsForWidth(width);
  if (available.includes(position)) return position;
  if (width === "full" || position === "center") return "center";

  const side = position.startsWith("right") ? "right" : "left";
  return width === "wide" ? `${side}-full` : `${side}-wide`;
}

