"use client";

import { Move, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { PersonnelPhotoFocus } from "../demo/model";
import { personnelPhotoPositionStyle } from "./personnel-photo-position";

type Props = {
  imageStyle: CSSProperties | undefined;
  value: PersonnelPhotoFocus;
  onChange: (value: PersonnelPhotoFocus) => void;
  zoom?: number;
  onZoomChange?: (value: number) => void;
  actions?: ReactNode;
  controlActions?: ReactNode;
  subject?: string;
  resetFocus?: PersonnelPhotoFocus;
};
type DragStart = {
  pointerX: number;
  pointerY: number;
  focus: PersonnelPhotoFocus;
};
const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function PersonnelPhotoFocusEditor({
  imageStyle,
  value,
  onChange,
  zoom = 100,
  onZoomChange,
  actions,
  controlActions,
  subject = "รูป",
  resetFocus = { x: 50, y: 25 },
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<DragStart | null>(null);
  function startDragging(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      focus: value,
    };
  }
  function dragImage(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!start || !bounds) return;
    onChange({
      x: clamp(
        start.focus.x - ((event.clientX - start.pointerX) / bounds.width) * 100,
      ),
      y: clamp(
        start.focus.y -
          ((event.clientY - start.pointerY) / bounds.height) * 100,
      ),
    });
  }
  function stopDragging(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    dragStart.current = null;
  }
  return (
    <div className="unit-photo-focus">
      <div className="unit-photo-focus-preview-stack">
        <div
          ref={previewRef}
          className="unit-photo-focus-preview"
          style={{ ...imageStyle, ...personnelPhotoPositionStyle(value, zoom) }}
          onPointerDown={startDragging}
          onPointerMove={dragImage}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          role="img"
          aria-label={`ตัวอย่างพื้นที่แสดง${subject} ลากเพื่อจัดตำแหน่ง`}
        >
          <span className="unit-photo-drag-hint" aria-hidden="true"><Move size={20}/><small>ลากเพื่อเลื่อนรูป</small></span>
        </div>
        {actions}
      </div>
      <div className="unit-photo-focus-controls">
        <strong>จัดตำแหน่ง{subject}</strong>
        <small>ลาก{subject}ในวงกลมเพื่อเลื่อนตำแหน่ง ผลลัพธ์ที่เห็นคือ{subject}ที่จะนำไปแสดง</small>
        {onZoomChange ? <label className="unit-photo-zoom"><span><ZoomOut size={17}/><b>ขนาด{subject} {zoom}%</b><ZoomIn size={17}/></span><input type="range" min="100" max="300" step="5" value={zoom} aria-label={`ปรับขนาด${subject}`} onChange={(event) => onZoomChange(Number(event.target.value))}/><i><small>พอดีกรอบ</small><small>ขยาย 3 เท่า</small></i></label> : null}
        {controlActions ? <div className="unit-general-cover-actions unit-photo-control-actions">{controlActions}</div> : <button type="button" onClick={() => { onChange(resetFocus); onZoomChange?.(100); }}>คืนค่าตำแหน่งเริ่มต้น</button>}
      </div>
    </div>
  );
}
