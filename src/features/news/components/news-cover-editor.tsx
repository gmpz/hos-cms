"use client";

import { Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { DemoMediaItem } from "@/features/media/demo/media-items";
import type { DemoPost } from "@/features/pages/demo/data";
import { newsCoverOverflow } from "../cover-display";
import { NewsCoverImage } from "./news-cover-image";

type Framing = Pick<DemoPost, "coverFit" | "coverFocus" | "coverZoom">;
type Drag = { id: number; x: number; y: number; focus: Framing["coverFocus"]; overflow: { x: number; y: number } };
const clampFocus = (value: number) => Math.round(Math.max(0, Math.min(100, value)));

export function NewsCoverEditor({ post, cover, onChange }: {
  post: Framing;
  cover: DemoMediaItem | null;
  onChange: (value: Partial<Framing>) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const [imageSize, setImageSize] = useState<{ url: string; width: number; height: number } | null>(null);
  const url = cover?.previewUrl;
  const editable = Boolean(cover) && post.coverFit === "cover";
  const zoom = post.coverZoom ?? 100;

  useEffect(() => {
    if (!url) return;
    const image = new Image();
    image.onload = () => setImageSize({ url, width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
    return () => { image.onload = null; };
  }, [url]);

  function startDrag(event: PointerEvent<HTMLSpanElement>) {
    if (!editable || event.button !== 0 || !imageSize || imageSize.url !== url) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, focus: post.coverFocus,
      overflow: newsCoverOverflow(bounds.width, bounds.height, imageSize.width, imageSize.height, zoom),
    };
  }

  function moveImage(event: PointerEvent<HTMLSpanElement>) {
    const start = drag.current;
    if (!editable || !start || start.id !== event.pointerId) return;
    onChange({ coverFocus: {
      x: start.overflow.x > 0.5 ? clampFocus(start.focus.x - (event.clientX - start.x) / start.overflow.x * 100) : start.focus.x,
      y: start.overflow.y > 0.5 ? clampFocus(start.focus.y - (event.clientY - start.y) / start.overflow.y * 100) : start.focus.y,
    } });
  }

  function stopDrag(event: PointerEvent<HTMLSpanElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <>
    <article className="public-news-index-card news-cover-card-preview" aria-label="ตัวอย่างตำแหน่งรูปบนการ์ดข่าว">
      <span
        className={`public-related-news-cover public-news-index-cover news-cover-viewport ${cover ? "" : "fallback-logo"} ${editable ? "is-editable" : ""}`}
        style={cover ? undefined : { backgroundImage: "url(/hospital-logo.png)" }}
        onPointerDown={startDrag} onPointerMove={moveImage} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { drag.current = null; }}
        role={editable ? "group" : "img"} tabIndex={editable ? 0 : undefined}
        aria-label={editable ? "จัดตำแหน่งรูปปก ลากภาพหรือใช้ปุ่มลูกศรเพื่อเลื่อน" : cover?.alt || "ตราสัญลักษณ์โรงพยาบาล"}
        onKeyDown={(event) => {
          if (!editable || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 2;
          onChange({ coverFocus: {
            x: clampFocus(post.coverFocus.x + (event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0)),
            y: clampFocus(post.coverFocus.y + (event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0)),
          } });
        }}
      >
        {cover ? <NewsCoverImage post={post} media={cover} /> : null}
        {editable ? <span className="news-cover-drag-hint" aria-hidden="true"><Move size={14} /> ลากเพื่อเลื่อนรูป</span> : null}
      </span>
      <div className="news-cover-card-empty" aria-hidden="true">
        <span className="news-cover-card-sample-title"><i/><i/></span>
        <span className="news-cover-card-sample-date"><i/>00 ม.ค. 0000</span>
      </div>
    </article>
    {editable ? <section className="news-cover-zoom-controls" aria-label="ปรับขนาดรูปปก">
      <div className="news-cover-zoom-heading"><span>ซูมรูป <output>{zoom}%</output></span><button type="button" onClick={() => onChange({ coverFocus: { x: 50, y: 50 }, coverZoom: 100 })}><RotateCcw size={13} /> คืนค่า</button></div>
      <div className="news-cover-zoom-slider">
        <button type="button" aria-label="ซูมรูปออก" disabled={zoom <= 100} onClick={() => onChange({ coverZoom: Math.max(100, zoom - 5) })}><ZoomOut size={17} /></button>
        <input type="range" min="100" max="300" step="1" value={zoom} aria-label="ซูมรูปปก" aria-valuetext={`${zoom}%`} onChange={(event) => onChange({ coverZoom: Number(event.target.value) })} />
        <button type="button" aria-label="ซูมรูปเข้า" disabled={zoom >= 300} onClick={() => onChange({ coverZoom: Math.min(300, zoom + 5) })}><ZoomIn size={17} /></button>
      </div>
    </section> : null}
    <small className="news-cover-hint">ตัวอย่างการ์ดข่าว · แนะนำรูปแนวนอน 1600 × 1000 พิกเซล</small>
    {cover ? <>
      <div className="news-cover-display-options" role="group" aria-label="รูปแบบการแสดงรูปปก">
        <button type="button" className={post.coverFit === "cover" ? "selected" : ""} aria-pressed={post.coverFit === "cover"} onClick={() => onChange({ coverFit: "cover" })}>เต็มกรอบ</button>
        <button type="button" className={post.coverFit !== "cover" ? "selected" : ""} aria-pressed={post.coverFit !== "cover"} onClick={() => onChange({ coverFit: "contain" })}>เห็นภาพทั้งหมด</button>
      </div>
      <small className="news-cover-fit-hint">{editable ? "ลากรูปบนการ์ดเพื่อจัดตำแหน่ง แล้วปรับซูมได้ตามต้องการ" : "เห็นรูปครบ แต่รูปที่ไม่พอดีกรอบจะมีพื้นที่ว่าง"}</small>
    </> : null}
  </>;
}
