"use client";

import { Move } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { UnitCoverFocus } from "../demo/model";
import { unitCoverStyle } from "./unit-cover-style";

type Props = {
  imageStyle: CSSProperties | undefined;
  imageUrl: string | null;
  dimensions: string;
  value: UnitCoverFocus;
  onChange: (value: UnitCoverFocus) => void;
  variant?: "hero" | "card";
};

type DragStart = {
  pointerX: number;
  pointerY: number;
  focus: UnitCoverFocus;
};

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function UnitCoverFocusEditor({ imageStyle, imageUrl, dimensions, value, onChange, variant = "hero" }: Props) {
  const [naturalSize, setNaturalSize] = useState<{ url: string; width: number; height: number } | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  const stageWidth = variant === "card" ? 480 : 1220;
  const stageHeight = variant === "card" ? 300 : 315;
  const previewScale = previewWidth ? Math.min(1, previewWidth / stageWidth) : 0;
  const imageDimensions = dimensions.match(/(\d+)\s*[×x]\s*(\d+)/);
  const imageWidth = naturalSize?.url === imageUrl ? naturalSize.width : Number(imageDimensions?.[1]);
  const imageHeight = naturalSize?.url === imageUrl ? naturalSize.height : Number(imageDimensions?.[2]);

  useEffect(() => {
    if (!imageUrl) return;
    const image = new Image();
    image.onload = () => setNaturalSize({ url: imageUrl, width: image.naturalWidth, height: image.naturalHeight });
    image.src = imageUrl;
    return () => { image.onload = null; };
  }, [imageUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => setPreviewWidth(viewport.clientWidth));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function startDragging(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      focus: value,
    };
  }

  function dragImage(event: PointerEvent<HTMLElement>) {
    const start = dragStart.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!start) return;
    const scale = imageWidth && imageHeight
      ? Math.max(bounds.width / imageWidth, bounds.height / imageHeight)
      : 0;
    const zoom = start.focus.zoom ?? 1;
    const overflowX = Math.max(0, imageWidth * scale * zoom - bounds.width);
    const overflowY = Math.max(0, imageHeight * scale * zoom - bounds.height);
    onChange({
      x: overflowX ? clamp(start.focus.x - ((event.clientX - start.pointerX) / overflowX) * 100) : start.focus.x,
      y: overflowY ? clamp(start.focus.y - ((event.clientY - start.pointerY) / overflowY) * 100) : start.focus.y,
      zoom: start.focus.zoom,
    });
  }

  function stopDragging(event: PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    dragStart.current = null;
  }

  return (
    <div ref={viewportRef} className="unit-general-cover-editor" style={{ height: previewScale ? stageHeight * previewScale : undefined }}>
      <div
        className="unit-general-cover-canvas"
        style={{ width: stageWidth, height: stageHeight, transform: `scale(${previewScale})`, visibility: previewScale ? "visible" : "hidden" }}
        onPointerDown={startDragging}
        onPointerMove={dragImage}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 10 : 3;
          if (event.key === "ArrowLeft") onChange({ ...value, x: clamp(value.x - step) });
          else if (event.key === "ArrowRight") onChange({ ...value, x: clamp(value.x + step) });
          else if (event.key === "ArrowUp") onChange({ ...value, y: clamp(value.y - step) });
          else if (event.key === "ArrowDown") onChange({ ...value, y: clamp(value.y + step) });
          else return;
          event.preventDefault();
        }}
        tabIndex={0}
        role="group"
        aria-label={`${variant === "card" ? "ตัวอย่างรูปการ์ดหน่วยงาน" : "ตัวอย่างแบนเนอร์หน้ากลุ่มงาน"} ลากภาพเพื่อจัดตำแหน่ง`}
      >
        <span className="unit-cover-image-layer" style={unitCoverStyle(imageStyle, value)} aria-hidden="true"/>
      </div>
      {imageUrl ? <span className="unit-general-cover-drag-hint" aria-hidden="true"><Move size={16}/><small>ลากเพื่อเลื่อนรูป</small></span> : null}
    </div>
  );
}
