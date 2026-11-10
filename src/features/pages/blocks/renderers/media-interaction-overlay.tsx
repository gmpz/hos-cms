"use client";

import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MediaInteraction } from "../config/types";
import {
  getDemoMediaItem,
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import { useLinkTargetResolver } from "@/features/navigation/link-target-catalog-context";

export function MediaInteractionOverlay({ interaction, mediaId, label, disabled = false }: {
  interaction: MediaInteraction;
  mediaId: string | null;
  label: string;
  disabled?: boolean;
}) {
  const resolveTarget = useLinkTargetResolver();
  const [open, setOpen] = useState(false);
  const [openedMedia, setOpenedMedia] = useState<{
    mediaId: string;
    label: string;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const media = getDemoMediaItem(mediaId);
  const lightboxMedia = getDemoMediaItem(openedMedia?.mediaId ?? null);
  const changeZoom = (next: number) => {
    const clamped = Math.min(3, Math.max(1, next));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };
  return <>
    {disabled || interaction.kind === "none" ? null : interaction.kind === "link" ? (
      <a className="media-interaction-layer is-link"
        href={resolveTarget(interaction.target)}
        target={interaction.openInNewTab ? "_blank" : undefined}
        rel={interaction.openInNewTab ? "noopener noreferrer" : undefined}
        aria-label={label} />
    ) : media ? (
      <button type="button" className="media-interaction-layer is-lightbox"
        onClick={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
          setOpenedMedia({ mediaId: media.id, label });
          setOpen(true);
        }} aria-label={`เปิดดูภาพขนาดใหญ่: ${label}`} />
    ) : null}
    {open && lightboxMedia && openedMedia ? createPortal(
      <div className="gallery-lightbox" role="dialog" aria-modal="true">
        <button type="button" className="gallery-lightbox-backdrop"
          onClick={() => setOpen(false)} aria-label="ปิดภาพขนาดใหญ่" />
        <div className="gallery-lightbox-content media-lightbox-content">
          <button type="button" className="gallery-lightbox-close"
            onClick={() => setOpen(false)} aria-label="ปิด"><X size={22} /></button>
          <div
            className={`media-lightbox-viewport ${zoom > 1 ? "can-pan" : ""}`}
            onWheel={(event) => {
              event.preventDefault();
              changeZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
            }}
            onDoubleClick={() => changeZoom(zoom === 1 ? 2 : 1)}
            onPointerDown={(event) => {
              if (zoom <= 1) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStart.current = {
                clientX: event.clientX,
                clientY: event.clientY,
                x: pan.x,
                y: pan.y,
              };
            }}
            onPointerMove={(event) => {
              if (!dragStart.current || zoom <= 1) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const maxX = bounds.width * (zoom - 1) / 2;
              const maxY = bounds.height * (zoom - 1) / 2;
              const x = dragStart.current.x + event.clientX - dragStart.current.clientX;
              const y = dragStart.current.y + event.clientY - dragStart.current.clientY;
              setPan({
                x: Math.min(maxX, Math.max(-maxX, x)),
                y: Math.min(maxY, Math.max(-maxY, y)),
              });
            }}
            onPointerUp={() => { dragStart.current = null; }}
            onPointerCancel={() => { dragStart.current = null; }}
          >
            <div className="gallery-lightbox-image media-lightbox-image"
              style={{ ...mediaPreviewStyle(lightboxMedia), transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              role="img" aria-label={openedMedia.label} />
          </div>
          <div className="media-lightbox-controls" aria-label="เครื่องมือขยายภาพ">
            <button type="button" onClick={() => changeZoom(zoom - 0.25)}
              disabled={zoom <= 1} aria-label="ซูมออก"><ZoomOut size={19} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => changeZoom(zoom + 0.25)}
              disabled={zoom >= 3} aria-label="ซูมเข้า"><ZoomIn size={19} /></button>
            <button type="button" onClick={() => changeZoom(1)} disabled={zoom === 1}
              aria-label="คืนขนาดภาพ"><RotateCcw size={18} /></button>
          </div>
        </div>
      </div>, document.body) : null}
  </>;
}
