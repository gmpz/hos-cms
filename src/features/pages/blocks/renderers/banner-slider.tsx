"use client";
import { PublicImageLoading } from "@/components/public/public-image-loading";


import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { BlockConfigMap } from "../config/types";
import { SecondaryRichText } from "./secondary-rich-text";
import { MediaInteractionOverlay } from "./media-interaction-overlay";
import {
  mediaPreviewStyle,
  subscribeDemoMedia,
} from "@/features/media/demo/media-registry";
import { displayMediaFor } from "@/features/media/resolved-media";

export function BannerSlider({
  config,
  interactionDisabled = false,
}: {
  config: BlockConfigMap["bannerSlider"];
  interactionDisabled?: boolean;
}) {
  const [settledImages, setSettledImages] = useState<ReadonlySet<string>>(() => new Set());
  const imageSettled = useCallback((src: string) => {
    setSettledImages(current => current.has(src) ? current : new Set([...current, src]));
  }, []);
  const [position, setPosition] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const moving = useRef(false);
  const resetFrame = useRef<number | null>(null);
  const [, setMediaRevision] = useState(0);
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
  const activeSlides = config.mode === "single" ? config.slides.slice(0, 1) : config.slides;
  const resolvedSlides = activeSlides.map((slide) => ({
    slide,
    media: displayMediaFor(slide, "imageId"),
  }));
  const slidesWithImages = resolvedSlides.filter((item) => item.media);
  const displaySlides = config.presentation === "imageOnly" ? slidesWithImages : resolvedSlides;
  const count = displaySlides.length;
  const safePosition = position > count + 1 ? 1 : position;
  const safeActive = count > 0 ? (safePosition - 1 + count) % count : 0;
  const activeImage = displaySlides[safeActive]?.media?.previewUrl;
  const activeImageReady = !activeImage || settledImages.has(activeImage);
  const move = (direction: -1 | 1) => {
    if (count < 2 || moving.current) return;
    moving.current = true;
    setTransitionEnabled(true);
    setPosition(safePosition + direction);
  };
  const selectSlide = (index: number) => {
    if (count < 2 || moving.current || index === safeActive) return;
    moving.current = true;
    setTransitionEnabled(true);
    setPosition(index + 1);
  };
  useEffect(() => () => {
    if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
  }, []);
  useEffect(() => {
    if (!activeImageReady || config.mode !== "slider" || !config.autoplay || count < 2) return;
    const timer = window.setInterval(
      () => {
        if (moving.current) return;
        moving.current = true;
        setPosition((value) => (value > count + 1 ? 2 : value + 1));
      },
      config.intervalSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [config.mode, config.autoplay, config.intervalSeconds, count, activeImageReady, safeActive]);
  if (count === 0) {
    if (config.presentation !== "imageOnly" || !interactionDisabled) return null;
    return (
      <div className={`banner-slider banner-height-${config.height} banner-presentation-imageOnly banner-empty`}>
        <div className="banner-slide">
          <div className="banner-image-placeholder">
            <span>เพิ่มรูปภาพในสไลด์เพื่อแสดงแบนเนอร์</span>
          </div>
        </div>
      </div>
    );
  }
  const trackSlides = count > 1
    ? [displaySlides[count - 1], ...displaySlides, displaySlides[0]]
    : displaySlides;
  return (
    <div
      className={`banner-slider banner-height-${config.height} banner-presentation-${config.presentation}`}
      aria-roledescription="carousel"
      aria-label="แบนเนอร์ประชาสัมพันธ์"
    >
      <div
        className="banner-slider-track"
        style={{ transform: `translate3d(-${(count > 1 ? safePosition : 0) * 100}%, 0, 0)`, transition: transitionEnabled ? undefined : "none" }}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
          if (position === 0 || position === count + 1) {
            setTransitionEnabled(false);
            setPosition(position === 0 ? count : 1);
            resetFrame.current = window.requestAnimationFrame(() => {
              resetFrame.current = window.requestAnimationFrame(() => {
                setTransitionEnabled(true);
                moving.current = false;
                resetFrame.current = null;
              });
            });
          } else moving.current = false;
        }}
      >
        {trackSlides.map(({ slide, media }, index) => {
          const slideIndex = count > 1 ? (index - 1 + count) % count : 0;
          const visible = index === (count > 1 ? safePosition : 0);
          const previewStyle = media ? mediaPreviewStyle(media) : undefined;
          const slideStyle = media
            ? ({
                ...previewStyle,
                backgroundPosition: `${slide.focalPoint.x}% ${slide.focalPoint.y}%`,
                "--banner-blur-image": previewStyle?.backgroundImage ?? "none",
                "--banner-focus-position": `${slide.focalPoint.x}% ${slide.focalPoint.y}%`,
                "--banner-image-zoom": String((slide.zoom ?? 100) / 100),
              } as CSSProperties)
            : undefined;
          return <div
            key={`${slide.id}-${index}`}
            className={`banner-slide banner-tone-${slideIndex % 3} content-position-${config.contentPosition} ${media ? "has-media" : ""}`}
            style={slideStyle}
            aria-label={config.presentation === "imageOnly" ? slide.title : undefined}
            role={config.presentation === "imageOnly" ? "img" : undefined}
            aria-hidden={!visible}
            inert={!visible}
          >
            <PublicImageLoading src={media?.previewUrl} onSettled={imageSettled} />
            <MediaInteractionOverlay interaction={slide.imageInteraction} media={media ?? null} label={slide.title || "แบนเนอร์"} disabled={interactionDisabled} />
            {config.presentation === "imageOnly" ? (
              <div className="banner-image-placeholder" aria-hidden="true">
                {media ? null : <span>เลือกรูปภาพจากคลังสื่อ</span>}
              </div>
            ) : (
              <>
                <div className="banner-content">
                  <h1>{slide.title}</h1>
                  {slide.description.trim() ? (
                    <SecondaryRichText value={slide.description} />
                  ) : null}
                </div>
              </>
            )}
          </div>;
        })}
      </div>
      {count > 1 ? (
        <>
          <button
            type="button"
            className="banner-arrow previous"
            aria-label="สไลด์ก่อนหน้า"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="banner-arrow next"
            aria-label="สไลด์ถัดไป"
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
          <div className="banner-dots">
            {displaySlides.map(({ slide: item }, index) => (
              <button
                type="button"
                key={item.id}
                className={index === safeActive ? "active" : ""}
                aria-label={`แสดงสไลด์ ${index + 1}`}
                aria-current={index === safeActive}
                onClick={() => selectSlide(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SingleBanner({
  config,
  interactionDisabled = false,
}: {
  config: BlockConfigMap["hero"];
  interactionDisabled?: boolean;
}) {
  return (
    <BannerSlider
      interactionDisabled={interactionDisabled}
      config={{
        mode: "single",
        slides: [
          {
            id: "single-banner",
            title: config.title,
            description: config.description,
            imageId: config.imageId,
            focalPoint: config.focalPoint,
            zoom: 100,
            imageInteraction: config.imageInteraction,
            action: config.action,
          },
        ],
        autoplay: false,
        intervalSeconds: 5,
        height: config.height,
        presentation: config.presentation,
        contentPosition: config.contentPosition,
      }}
    />
  );
}
