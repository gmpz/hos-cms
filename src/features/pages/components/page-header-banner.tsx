"use client";

import { useState, type CSSProperties } from "react";
import { PublicImageLoading } from "@/components/public/public-image-loading";
import { mediaPreviewStyle } from "@/features/media/demo/media-registry";
import { PublicIndexHero } from "@/components/public/public-index-hero";
import { displayMediaFor } from "@/features/media/resolved-media";
import type { DemoPage } from "../demo/model";

export function PageHeaderBanner({ page }: { page: DemoPage }) {
  if (page.header.mode === "hidden") return null;
  const custom = page.header.mode === "custom";
  const eyebrow = custom && page.header.eyebrow.trim() ? page.header.eyebrow : "หน้าเว็บไซต์";
  const title = custom && page.header.title.trim() ? page.header.title : page.title;
  const description = custom ? page.header.description.trim() : "";
  const media = custom ? displayMediaFor(page.header, "imageId") : null;
  if (media?.previewUrl) {
    return <PageHeaderWithImage
      key={media.previewUrl}
      src={media.previewUrl}
      imageStyle={{ ...mediaPreviewStyle(media), backgroundPosition: `${page.header.focalPoint.x}% ${page.header.focalPoint.y}%` }}
      eyebrow={eyebrow}
      title={title}
      description={description}
    />;
  }
  return (
    <PublicIndexHero
      eyebrow={eyebrow}
      title={title}
      description={description || undefined}
      className="page-header-banner"
    />
  );
}

function PageHeaderWithImage({ src, imageStyle, eyebrow, title, description }: {
  src: string;
  imageStyle: CSSProperties;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const [imageStatus, setImageStatus] = useState<"pending" | "ready" | "error">("pending");
  return <PublicIndexHero
    eyebrow={eyebrow}
    title={title}
    description={description || undefined}
    className={`page-header-banner${imageStatus === "ready" ? " has-image" : ""}${imageStatus === "pending" ? " is-image-pending" : ""}`}
    style={imageStatus === "ready" ? imageStyle : undefined}
  >
    {imageStatus === "pending" ? <PublicImageLoading src={src} onSettled={(_, result) => setImageStatus(result)}/> : null}
  </PublicIndexHero>;
}
