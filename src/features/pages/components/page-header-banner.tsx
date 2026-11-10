"use client";

import { getDemoMediaItem, mediaPreviewStyle } from "@/features/media/demo/media-registry";
import { useMediaRevision } from "@/features/media/use-media-revision";
import { PublicIndexHero } from "@/components/public/public-index-hero";
import type { DemoPage } from "../demo/model";

export function PageHeaderBanner({ page }: { page: DemoPage }) {
  const mediaReady = useMediaRevision();
  if (page.header.mode === "hidden") return null;
  const custom = page.header.mode === "custom";
  const eyebrow = custom && page.header.eyebrow.trim() ? page.header.eyebrow : "หน้าเว็บไซต์";
  const title = custom && page.header.title.trim() ? page.header.title : page.title;
  const description = custom ? page.header.description.trim() : "";
  const media = custom && mediaReady ? getDemoMediaItem(page.header.imageId) : null;
  return (
    <PublicIndexHero
      eyebrow={eyebrow}
      title={title}
      description={description || undefined}
      className={`page-header-banner${media ? " has-image" : ""}`}
      style={media ? {
        ...mediaPreviewStyle(media),
        backgroundPosition: `${page.header.focalPoint.x}% ${page.header.focalPoint.y}%`,
      } : undefined}
    />
  );
}
