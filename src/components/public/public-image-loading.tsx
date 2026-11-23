"use client";

import { useEffect, useState } from "react";

// Keying the loader resets its state when a slide or media source changes.
type ImageResult = "ready" | "error";
type Props = { src?: string | null; onSettled?: (src: string, result: ImageResult) => void };
export function PublicImageLoading({ src, onSettled }: Props) {
  return src ? <ImageLoading key={src} src={src} onSettled={onSettled} /> : null;
}

function ImageLoading({ src, onSettled }: { src: string; onSettled?: (src: string, result: ImageResult) => void }) {
  const [status, setStatus] = useState<"pending" | ImageResult>("pending");
  useEffect(() => {
    const image = new Image();
    let active = true;
    let settled = false;
    const settle = (next: ImageResult) => {
      if (!active || settled) return;
      settled = true;
      setStatus(next);
      onSettled?.(src, next);
    };
    image.onload = () => settle("ready");
    image.onerror = () => settle("error");
    image.src = src;
    if (image.complete) {
      queueMicrotask(() => { settle(image.naturalWidth > 0 ? "ready" : "error"); });
    }
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [src, onSettled]);
  if (status === "ready") return null;
  return <span className={`public-image-loading ${status}`} aria-hidden="true">
    {status === "error" ? <span>ไม่สามารถโหลดรูปภาพได้</span> : null}
  </span>;
}
