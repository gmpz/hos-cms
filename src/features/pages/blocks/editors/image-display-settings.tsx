"use client";

import { Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { mediaPreviewStyle } from "@/features/media/demo/media-registry";
import { displayMediaFor } from "@/features/media/resolved-media";
import type { BlockConfigMap } from "../config/types";

type ImageConfig = BlockConfigMap["image"];
type DragStart = { id: number; x: number; y: number; focus: ImageConfig["focalPoint"]; overflow: { x: number; y: number } };
const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
const previewRatio: Record<ImageConfig["aspectRatio"], string> = { original: "16 / 9", "16:9": "16 / 9", "4:3": "4 / 3", "1:1": "1", "4:5": "4 / 5", a4: "210 / 297" };

export function ImageDisplaySettings({ config, onChange, cropOnly = false }: { config: ImageConfig; onChange: (change: Partial<ImageConfig>) => void; cropOnly?: boolean }) {
  const media = displayMediaFor(config);
  const imageUrl = media?.previewUrl ?? null;
  const drag = useRef<DragStart | null>(null);
  const [imageSize, setImageSize] = useState<{ url: string; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!imageUrl) return;
    const image = new Image();
    image.onload = () => setImageSize({ url: imageUrl, width: image.naturalWidth, height: image.naturalHeight });
    image.src = imageUrl;
    return () => { image.onload = null; };
  }, [imageUrl]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !imageSize || imageSize.url !== imageUrl) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(bounds.width / imageSize.width, bounds.height / imageSize.height) * (config.zoom / 100);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, focus: config.focalPoint, overflow: { x: Math.max(0, imageSize.width * scale - bounds.width), y: Math.max(0, imageSize.height * scale - bounds.height) } };
  }

  function moveImage(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    onChange({ focalPoint: { x: start.overflow.x > 0.5 ? clamp(start.focus.x - ((event.clientX - start.x) / start.overflow.x) * 100) : start.focus.x, y: start.overflow.y > 0.5 ? clamp(start.focus.y - ((event.clientY - start.y) / start.overflow.y) * 100) : start.focus.y } });
  }

  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const aspectRatio = cropOnly && config.aspectRatio === "original" ? "4:3" : config.aspectRatio;
  const showCropEditor = cropOnly || config.fit === "cover";
  return <>
    <label className="settings-field"><span>สัดส่วนภาพ</span><NativeSelect value={aspectRatio} onChange={(event) => { const value = event.target.value as ImageConfig["aspectRatio"]; onChange(cropOnly ? { aspectRatio: value, fit: "cover" } : value === "a4" ? { aspectRatio: value, fit: "contain" } : { aspectRatio: value }); }}>{cropOnly ? null : <option value="original">สัดส่วนต้นฉบับ</option>}<option value="16:9">แนวนอน 16:9</option><option value="4:3">แนวนอน 4:3</option><option value="1:1">สี่เหลี่ยม 1:1</option><option value="4:5">แนวตั้ง 4:5</option>{cropOnly ? null : <option value="a4">เอกสาร A4 แนวตั้ง (210:297)</option>}</NativeSelect></label>
    {cropOnly ? null : <label className="settings-field"><span>การแสดงภาพ</span><NativeSelect value={config.fit} disabled={config.aspectRatio === "a4"} onChange={(event) => onChange({ fit: event.target.value as ImageConfig["fit"] })}><option value="contain">แสดงครบทั้งภาพ</option><option value="cover">เต็มกรอบ อาจตัดภาพ</option></NativeSelect></label>}
    {!cropOnly && config.aspectRatio === "a4" ? <small className="image-a4-hint">เอกสาร A4 จะแสดงเต็มหน้าโดยไม่ตัดเนื้อหา</small> : null}
    {showCropEditor ? <div className="image-crop-position-setting">
      <span>จัดตำแหน่งภาพ</span>
      <div className="image-crop-position-viewport" style={{ aspectRatio: previewRatio[aspectRatio] }} onPointerDown={startDrag} onPointerMove={moveImage} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { drag.current = null; }} onKeyDown={(event) => { if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return; event.preventDefault(); const step = event.shiftKey ? 10 : 2; onChange({ focalPoint: { x: clamp(config.focalPoint.x + (event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0)), y: clamp(config.focalPoint.y + (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0)) } }); }} tabIndex={0} role="group" aria-label="ลากภาพเพื่อจัดตำแหน่งในกรอบ">
        {imageUrl ? <span className="image-crop-position-image" style={{ ...mediaPreviewStyle(media), backgroundPosition: `${config.focalPoint.x}% ${config.focalPoint.y}%`, transform: `scale(${config.zoom / 100})`, transformOrigin: `${config.focalPoint.x}% ${config.focalPoint.y}%` }} aria-hidden="true" /> : null}
        {imageUrl ? <span className="image-crop-drag-hint" aria-hidden="true"><Move size={14}/>ลากเพื่อเลื่อนรูป</span> : null}
      </div>
      <div className="image-crop-zoom-controls">
        <div><span>ซูมรูป <output>{config.zoom}%</output></span><button type="button" onClick={() => onChange({ zoom: 100, focalPoint: { x: 50, y: 50 } })}><RotateCcw size={15}/>คืนค่า</button></div>
        <label><ZoomOut size={17}/><input type="range" min="100" max="300" step="5" value={config.zoom} onChange={(event) => onChange({ zoom: Number(event.target.value) })} aria-label="ซูมรูป"/><ZoomIn size={17}/></label>
      </div>
      <small>ลากภาพให้ส่วนสำคัญอยู่ในกรอบ</small>
    </div> : null}
  </>;
}
