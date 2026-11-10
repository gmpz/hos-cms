import type { CSSProperties } from "react";
import type { SiteSettings } from "./types";

export function logoPositionStyle(settings: Pick<SiteSettings, "logoFocusX" | "logoFocusY" | "logoZoom">): CSSProperties {
  return {
    backgroundPosition: `${settings.logoFocusX}% ${settings.logoFocusY}%`,
    backgroundSize: `${settings.logoZoom}% auto`,
    backgroundRepeat: "no-repeat",
  };
}
