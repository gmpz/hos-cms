"use client";
import { PublicImageLoading } from "@/components/public/public-image-loading";


import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  mediaPreviewStyle,
  subscribeDemoMedia,
} from "@/features/media/demo/media-registry";
import type { BlockConfigMap } from "../config/types";
import { displayMediaFor } from "@/features/media/resolved-media";

type GalleryConfig = BlockConfigMap["gallery"];

function sliderImages(track: HTMLDivElement) {
  return [...track.querySelectorAll<HTMLButtonElement>(".gallery-slider-image")];
}

function centeredImageIndex(track: HTMLDivElement, images: HTMLButtonElement[]) {
  const center = track.getBoundingClientRect().left + track.clientWidth / 2;
  return images.reduce((nearest, image, index) => {
    const bounds = image.getBoundingClientRect();
    const distance = Math.abs(bounds.left + bounds.width / 2 - center);
    const nearestBounds = images[nearest].getBoundingClientRect();
    const nearestDistance = Math.abs(nearestBounds.left + nearestBounds.width / 2 - center);
    return distance < nearestDistance ? index : nearest;
  }, 0);
}

function centerSliderImage(track: HTMLDivElement, image: HTMLButtonElement) {
  const trackBounds = track.getBoundingClientRect();
  const imageBounds = image.getBoundingClientRect();
  track.scrollTo({
    left: track.scrollLeft + imageBounds.left + imageBounds.width / 2 - trackBounds.left - trackBounds.width / 2,
    behavior: "smooth",
  });
}

function centersSliderImages(track: HTMLDivElement) {
  const image = track.querySelector<HTMLElement>(".gallery-slider-image");
  return image ? getComputedStyle(image).scrollSnapAlign.startsWith("center") : false;
}

function scrollSliderPage(track: HTMLDivElement, direction: -1 | 1) {
  const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
  track.scrollBy({ left: direction * (track.clientWidth + gap), behavior: "smooth" });
}

export function Gallery({ config }: { config: GalleryConfig }) {
  const [active, setActive] = useState<number | null>(null);
  const [, setMediaRevision] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const activeIndex = active ?? 0;
  const selected = active === null ? null : config.images[activeIndex];
  const media = selected ? displayMediaFor(selected) : null;
  const moveSlider = (direction: -1 | 1) => {
    const track = sliderRef.current;
    if (!track) return;
    if (!centersSliderImages(track)) {
      scrollSliderPage(track, direction);
      return;
    }
    const images = sliderImages(track);
    if (!images.length) return;
    const next = Math.max(0, Math.min(images.length - 1, centeredImageIndex(track, images) + direction));
    centerSliderImage(track, images[next]);
  };

  useEffect(() => {
    let mounted = true;
    const refresh = () => {
      if (mounted) setMediaRevision((value) => value + 1);
    };
    const unsubscribe = subscribeDemoMedia(refresh);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (config.layout !== "slider") return;
    const track = sliderRef.current;
    if (!track) return;
    let slideWidthRule = getComputedStyle(track).getPropertyValue("--gallery-slide-width").trim();
    const resetAfterLayoutChange = () => {
      const nextRule = getComputedStyle(track).getPropertyValue("--gallery-slide-width").trim();
      if (nextRule === slideWidthRule) return;
      slideWidthRule = nextRule;
      track.scrollLeft = 0;
    };
    const observer = new ResizeObserver(resetAfterLayoutChange);
    observer.observe(track);
    window.addEventListener("resize", resetAfterLayoutChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resetAfterLayoutChange);
    };
  }, [config.layout]);

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
      if (!centersSliderImages(track)) {
        const end = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= end - 4) track.scrollTo({ left: 0, behavior: "smooth" });
        else scrollSliderPage(track, 1);
        return;
      }
      const images = sliderImages(track);
      if (!images.length) return;
      const next = (centeredImageIndex(track, images) + 1) % images.length;
      centerSliderImage(track, images[next]);
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
        <div className="gallery-lightbox-image" style={mediaPreviewStyle(media)} role="img" aria-label={selected.alt || media?.alt || media?.name || "รูปภาพ"}><PublicImageLoading src={media?.previewUrl}/></div>
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
        const itemMedia = displayMediaFor(item);
        return <button type="button" className="gallery-slider-image" key={item.mediaId} onClick={() => setActive(index)} aria-label={`เปิดดูภาพขนาดใหญ่ ${item.alt || itemMedia?.name || `รูปที่ ${index + 1}`}`}>
          <span className={`block-media ${itemMedia ? "has-media" : ""}`} style={mediaPreviewStyle(itemMedia)} role="img" aria-label={item.alt || itemMedia?.alt || "รูปภาพ"}><PublicImageLoading src={itemMedia?.previewUrl}/></span>
        </button>;
      })}
      </div>
      {config.images.length > 1 ? <>
        <button type="button" className="gallery-slider-arrow previous" onClick={() => moveSlider(-1)} aria-label="เลื่อนภาพไปทางซ้าย"><ChevronLeft size={20}/></button>
        <span className="gallery-slider-count">{config.images.length} รูป</span>
        <button type="button" className="gallery-slider-arrow next" onClick={() => moveSlider(1)} aria-label="เลื่อนภาพไปทางขวา"><ChevronRight size={20}/></button>
      </> : null}
    </div> : <div className={`gallery-grid columns-${config.columns}`}>
      {config.images.length ? config.images.map((item, index) => {
        const itemMedia = displayMediaFor(item);
        return <button type="button" className="gallery-item" key={item.mediaId} onClick={() => setActive(index)} aria-label={`เปิดดูภาพขนาดใหญ่ ${item.alt || itemMedia?.name || `รูปที่ ${index + 1}`}`}>
          <span className={`block-media ${itemMedia ? "has-media" : ""}`} style={mediaPreviewStyle(itemMedia)} role="img" aria-label={item.alt || itemMedia?.alt || "รูปภาพ"}><PublicImageLoading src={itemMedia?.previewUrl}/></span>
        </button>;
      }) : <p className="block-placeholder">เลือกภาพจากคลังสื่อเพื่อสร้างแกลเลอรี</p>}
    </div>}
    {lightbox}
  </div>;
}
