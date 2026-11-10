"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getDemoMediaItem,
  hydrateDemoMedia,
  mediaPreviewStyle,
  subscribeDemoMedia,
} from "@/features/media/demo/media-registry";
import type { BlockConfigMap } from "../config/types";

type GalleryConfig = BlockConfigMap["gallery"];

export function Gallery({ config }: { config: GalleryConfig }) {
  const [active, setActive] = useState<number | null>(null);
  const [, setMediaRevision] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const activeIndex = active ?? 0;
  const selected = active === null ? null : config.images[activeIndex];
  const media = selected ? getDemoMediaItem(selected.mediaId) : null;
  const moveSlider = (direction: -1 | 1) => {
    const track = sliderRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (mounted) setMediaRevision((value) => value + 1);
    };
    const unsubscribe = subscribeDemoMedia(refresh);
    void hydrateDemoMedia().then(refresh);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (active === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowLeft") setActive((current) => current === null ? null : (current - 1 + config.images.length) % config.images.length);
      if (event.key === "ArrowRight") setActive((current) => current === null ? null : (current + 1) % config.images.length);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, config.images.length]);

  useEffect(() => {
    if (
      config.layout !== "slider" ||
      !config.autoplay ||
      config.images.length <= 4 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = window.setInterval(() => {
      const track = sliderRef.current;
      if (!track) return;
      const end = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= end - 4)
        track.scrollTo({ left: 0, behavior: "smooth" });
      else
        track.scrollBy({
          left: track.clientWidth,
          behavior: "smooth",
        });
    }, config.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [
    config.autoplay,
    config.images.length,
    config.intervalSeconds,
    config.layout,
  ]);

  const lightbox = selected && typeof document !== "undefined" ? createPortal(
    <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`ดูภาพขนาดใหญ่ ${selected.alt || media?.name || "รูปภาพ"}`}>
      <button type="button" className="gallery-lightbox-backdrop" onClick={() => setActive(null)} aria-label="ปิดรูปภาพ"/>
      <div className="gallery-lightbox-content">
        <button type="button" className="gallery-lightbox-close" onClick={() => setActive(null)} aria-label="ปิด"><X size={23}/></button>
        <div className="gallery-lightbox-image" style={mediaPreviewStyle(media)} role="img" aria-label={selected.alt || media?.alt || media?.name || "รูปภาพ"}/>
        {config.images.length > 1 ? <>
          <button type="button" className="gallery-lightbox-arrow previous" onClick={() => setActive((activeIndex - 1 + config.images.length) % config.images.length)} aria-label="รูปก่อนหน้า"><ChevronLeft size={27}/></button>
          <button type="button" className="gallery-lightbox-arrow next" onClick={() => setActive((activeIndex + 1) % config.images.length)} aria-label="รูปถัดไป"><ChevronRight size={27}/></button>
        </> : null}
        <footer><span>{activeIndex + 1} / {config.images.length}</span>{selected.alt || media?.alt ? <p>{selected.alt || media?.alt}</p> : null}</footer>
      </div>
    </div>,
    document.body,
  ) : null;

  return <div className="gallery-block">
    {config.title || config.description ? <header className="gallery-heading">
      {config.title ? <h2 className={`gallery-title size-${config.headingSize ?? "standard"}`}>{config.title}</h2> : null}
      {config.description ? <p>{config.description}</p> : null}
    </header> : null}
    {config.layout === "slider" && config.images.length ? <div className={`gallery-slider gallery-slider-four-up${config.images.length <= 4 ? " has-no-overflow" : ""}`} aria-roledescription="carousel" aria-label={config.title || "แกลเลอรีภาพ"}>
      <div className="gallery-slider-track" ref={sliderRef}>
      {config.images.map((item, index) => {
        const itemMedia = getDemoMediaItem(item.mediaId);
        return <button type="button" className="gallery-slider-image" key={item.mediaId} onClick={() => setActive(index)} aria-label={`เปิดดูภาพขนาดใหญ่ ${item.alt || itemMedia?.name || `รูปที่ ${index + 1}`}`}>
          <span className={`block-media ${itemMedia ? "has-media" : ""}`} style={mediaPreviewStyle(itemMedia)} role="img" aria-label={item.alt || itemMedia?.alt || "รูปภาพ"}/>
        </button>;
      })}
      </div>
      {config.images.length > 1 ? <>
        <button type="button" className="gallery-slider-arrow previous" onClick={() => moveSlider(-1)} aria-label="เลื่อนภาพไปทางซ้าย"><ChevronLeft size={24}/></button>
        <button type="button" className="gallery-slider-arrow next" onClick={() => moveSlider(1)} aria-label="เลื่อนภาพไปทางขวา"><ChevronRight size={24}/></button>
      </> : null}
    </div> : <div className={`gallery-grid columns-${config.columns}`}>
      {config.images.length ? config.images.map((item, index) => {
        const itemMedia = getDemoMediaItem(item.mediaId);
        return <button type="button" className="gallery-item" key={item.mediaId} onClick={() => setActive(index)} aria-label={`เปิดดูภาพขนาดใหญ่ ${item.alt || itemMedia?.name || `รูปที่ ${index + 1}`}`}>
          <span className={`block-media ${itemMedia ? "has-media" : ""}`} style={mediaPreviewStyle(itemMedia)} role="img" aria-label={item.alt || itemMedia?.alt || "รูปภาพ"}/>
        </button>;
      }) : <p className="block-placeholder">เลือกภาพจากคลังสื่อเพื่อสร้างแกลเลอรี</p>}
    </div>}
    {lightbox}
  </div>;
}
