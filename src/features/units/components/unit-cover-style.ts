import type { CSSProperties } from "react";
import type { UnitCoverFocus } from "../demo/model";

export function unitCoverStyle(imageStyle: CSSProperties | undefined, focus: UnitCoverFocus): CSSProperties {
  const zoom = Math.min(2, Math.max(1, focus.zoom ?? 1));
  const x = Math.min(100, Math.max(0, focus.x));
  const y = Math.min(100, Math.max(0, focus.y));
  return {
    ...imageStyle,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: "cover",
    transform: `translate(${(0.5 - x / 100) * (zoom - 1) * 100}%, ${(0.5 - y / 100) * (zoom - 1) * 100}%) scale(${zoom})`,
  };
}
