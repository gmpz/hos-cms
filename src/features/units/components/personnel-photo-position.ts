import type { CSSProperties } from "react";
import type { PersonnelPhotoFocus } from "../demo/model";

export const defaultPersonnelPhotoFocus: PersonnelPhotoFocus = { x: 50, y: 25 };

export function personnelPhotoPositionStyle(
  focus: PersonnelPhotoFocus | undefined,
  zoom = focus?.zoom ?? 100,
): CSSProperties {
  const point = focus ?? defaultPersonnelPhotoFocus;
  return { backgroundPosition: `${point.x}% ${point.y}%`, backgroundSize: `${zoom}% auto` };
}
