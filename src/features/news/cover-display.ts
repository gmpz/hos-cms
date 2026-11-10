import type { CSSProperties } from "react";
import type { DemoPost } from "@/features/pages/demo/data";

export function newsCoverDisplayStyle(post: Pick<DemoPost, "coverFit" | "coverFocus" | "coverZoom">): CSSProperties {
  const position = `${post.coverFocus?.x ?? 50}% ${post.coverFocus?.y ?? 50}%`;
  const zoom = post.coverFit === "cover" ? Math.min(300, Math.max(100, post.coverZoom ?? 100)) / 100 : 1;
  return {
    backgroundSize: post.coverFit === "cover" ? "cover" : "contain",
    backgroundPosition: position,
    transform: `scale(${zoom})`,
    transformOrigin: position,
  };
}

/** Available image travel after cover fitting and zooming, in viewport pixels. */
export function newsCoverOverflow(width: number, height: number, imageWidth: number, imageHeight: number, zoom: number) {
  const scale = Math.max(width / imageWidth, height / imageHeight) * zoom / 100;
  return { x: Math.max(0, imageWidth * scale - width), y: Math.max(0, imageHeight * scale - height) };
}
