"use client";

import { createId } from "@/utils/create-id";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { NativeSelect } from "@/components/ui/native-select";
import { ChevronDown, Columns3, GripVertical, Plus, Rows3, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { BlockConfigMap } from "../config/types";
import { readUnits } from "@/features/units/demo/storage";
import { phoneDigits, phoneExtensionMaxLength, phoneMaxLength } from "@/features/users/phone";

type SettingsProps<K extends keyof BlockConfigMap> = {
  config: BlockConfigMap[K];
  onChange: (config: BlockConfigMap[K]) => void;
};

const HeadingFields = ({
  title,
  description,
  onChange,
}: {
  title: string;
  description: string;
  onChange: (value: { title: string; description: string }) => void;
}) => <>
  <label><span>หัวข้อ</span><input value={title} onChange={(event) => onChange({ title: event.target.value, description })}/></label>
  <label><span>คำอธิบาย</span><textarea rows={2} value={description} onChange={(event) => onChange({ title, description: event.target.value })}/></label>
</>;

export function PersonnelSettings({ config, onChange }: SettingsProps<"personnel">) {
  const units = readUnits();
  return <div className="extended-block-settings">
    <HeadingFields title={config.title} description={config.description} onChange={(value) => onChange({ ...config, ...value })}/>
    <label><span>แหล่งข้อมูลบุคลากร</span><NativeSelect value={config.unitId ?? ""} onChange={(event) => onChange({ ...config, unitId: event.target.value || null })}><option value="">ทุกหน่วยงาน</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.shortName || unit.name}</option>)}</NativeSelect></label>
    <div className="extended-settings-grid">
      <label><span>จำนวนรายการ</span><NativeSelect value={config.limit} onChange={(event) => onChange({ ...config, limit: Number(event.target.value) as typeof config.limit })}>{[2,3,4,6,8].map((value) => <option key={value} value={value}>{value} คน</option>)}</NativeSelect></label>
      <label><span>จำนวนคอลัมน์</span><NativeSelect value={config.columns} onChange={(event) => onChange({ ...config, columns: Number(event.target.value) as typeof config.columns })}>{[2,3,4].map((value) => <option key={value} value={value}>{value} คอลัมน์</option>)}</NativeSelect></label>
    </div>
  </div>;
}

export function ProcessStepsSettings({ config, onChange }: SettingsProps<"processSteps">) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = config.items.find((item) => item.id === pendingDeleteId);
  const updateItem = (id: string, patch: Partial<(typeof config.items)[number]>) => onChange({ ...config, items: config.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const reorderItems = ({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return;
    const items = [...config.items];
    const [moved] = items.splice(source.index, 1);
    items.splice(destination.index, 0, moved);
    onChange({ ...config, items });
  };
  const confirmDelete = () => {
    if (!pendingDeleteId || config.items.length <= 1) return;
    onChange({ ...config, items: config.items.filter((item) => item.id !== pendingDeleteId) });
    setPendingDeleteId(null);
  };

  return <div className="extended-block-settings process-steps-settings">
    <HeadingFields title={config.title} description={config.description} onChange={(value) => onChange({ ...config, ...value })}/>
    <div className="block-display-settings process-layout-settings">
      <div className="block-icon-choice-field">
        <span>รูปแบบ</span>
        <div className="block-icon-choice-options" role="group" aria-label="รูปแบบขั้นตอนบริการ" data-count="2">
          <button type="button" aria-pressed={config.layout === "horizontal"} className={config.layout === "horizontal" ? "selected" : ""} onClick={() => onChange({ ...config, layout: "horizontal" })}><span className="block-choice-visual" aria-hidden="true"><Columns3 size={21}/></span><span className="block-choice-caption">แนวนอน</span></button>
          <button type="button" aria-pressed={config.layout === "vertical"} className={config.layout === "vertical" ? "selected" : ""} onClick={() => onChange({ ...config, layout: "vertical" })}><span className="block-choice-visual" aria-hidden="true"><Rows3 size={21}/></span><span className="block-choice-caption">แนวตั้ง</span></button>
        </div>
      </div>
    </div>
    <div className="news-tabs-settings-heading process-steps-settings-heading">
      <strong>รายการขั้นตอน ({config.items.length}/12)</strong>
      <button type="button" disabled={config.items.length >= 12} onClick={() => onChange({ ...config, items: [...config.items, { id: createId(), title: "ขั้นตอนใหม่", description: "" }] })}><Plus size={13}/> เพิ่มขั้นตอน</button>
    </div>
    <DragDropContext onDragEnd={reorderItems}>
      <Droppable droppableId="process-step-items">
        {(drop) => <div className="news-tabs-settings-list process-steps-settings-list" ref={drop.innerRef} {...drop.droppableProps}>
          {config.items.map((item, index) => <Draggable key={item.id} draggableId={item.id} index={index}>
            {(drag, state) => <details ref={drag.innerRef} {...drag.draggableProps} className={state.isDragging ? "dragging" : ""}>
              <summary className="news-tab-setting-header">
                <span {...drag.dragHandleProps} title="ลากเพื่อจัดลำดับ" onClick={(event) => event.preventDefault()}><GripVertical size={15}/></span>
                <strong>ขั้นตอนที่ {index + 1}</strong>
                <small>{item.title || "ยังไม่มีข้อมูล"}</small>
                <ChevronDown size={15}/>
              </summary>
              <div className="news-tab-settings-body process-step-item-fields">
                <label><span>หัวข้อขั้นตอน</span><input value={item.title} placeholder="หัวข้อขั้นตอน" onChange={(event) => updateItem(item.id, { title: event.target.value })}/></label>
                <label><span>รายละเอียด</span><textarea rows={2} value={item.description} placeholder="รายละเอียด" onChange={(event) => updateItem(item.id, { description: event.target.value })}/></label>
                <button type="button" className="remove-slide process-step-item-delete" disabled={config.items.length <= 1} onClick={() => setPendingDeleteId(item.id)}><Trash2 size={13}/> ลบขั้นตอน</button>
              </div>
            </details>}
          </Draggable>)}
          {drop.placeholder}
        </div>}
      </Droppable>
    </DragDropContext>
    {pendingDelete ? <ConfirmDialog title="ลบขั้นตอน?" description={`ขั้นตอน “${pendingDelete.title || "ยังไม่มีข้อมูล"}” จะถูกนำออกจาก Block ขั้นตอนบริการ`} confirmLabel="ลบขั้นตอน" onClose={() => setPendingDeleteId(null)} onConfirm={confirmDelete} layerClassName="process-step-delete-dialog-layer"/> : null}
  </div>;
}

export function ContactInfoSettings({ config, onChange }: SettingsProps<"contactInfo">) {
  const hoursMatch = config.hours.match(/^(\d{2}:\d{2})?\s*[-–]\s*(\d{2}:\d{2})?$/);
  const openingTime = hoursMatch?.[1] ?? "";
  const closingTime = hoursMatch?.[2] ?? "";
  const setHours = (start: string, end: string) => onChange({
    ...config,
    hours: start || end ? `${start} - ${end}` : "",
  });

  return <div className="extended-block-settings">
    <HeadingFields title={config.title} description={config.description} onChange={(value) => onChange({ ...config, ...value })}/>
    <label><span>สถานที่</span><input value={config.location} onChange={(event) => onChange({ ...config, location: event.target.value })}/></label>
    <label><span>โทรศัพท์</span><input type="tel" inputMode="numeric" autoComplete="tel" maxLength={phoneMaxLength} placeholder="เช่น 0812345678" value={config.phone} onChange={(event) => onChange({ ...config, phone: phoneDigits(event.target.value) })}/></label>
    <label><span>เบอร์ต่อ <small>(ถ้ามี)</small></span><input type="tel" inputMode="numeric" maxLength={phoneExtensionMaxLength} placeholder="เช่น 1234" value={config.internalPhone} onChange={(event) => onChange({ ...config, internalPhone: phoneDigits(event.target.value, phoneExtensionMaxLength) })}/></label>
    <label><span>อีเมล</span><input type="email" value={config.email} onChange={(event) => onChange({ ...config, email: event.target.value })}/></label>
    <div className="contact-info-hours">
      <span>เวลาทำการ</span>
      <div>
        <label><span>เริ่ม</span><input type="time" value={openingTime} onChange={(event) => setHours(event.target.value, closingTime)}/></label>
        <span aria-hidden="true">–</span>
        <label><span>สิ้นสุด</span><input type="time" value={closingTime} onChange={(event) => setHours(openingTime, event.target.value)}/></label>
      </div>
      {config.hours && !hoursMatch ? <small>ข้อมูลเดิม: {config.hours} — เลือกเวลาใหม่เพื่อเปลี่ยน</small> : null}
    </div>
  </div>;
}

export function MapSettings({ config, onChange }: SettingsProps<"map">) {
  const heights = [
    { value: "compact", label: "สั้น" },
    { value: "standard", label: "มาตรฐาน" },
    { value: "tall", label: "สูง" },
  ] as const;
  return <div className="extended-block-settings">
    <HeadingFields title={config.title} description={config.description} onChange={(value) => onChange({ ...config, ...value })}/>
    <label><span>ลิงก์ Google Maps</span><input value={config.url} placeholder="https://maps.app.goo.gl/..." onChange={(event) => onChange({ ...config, url: event.target.value })}/><small>คัดลอกลิงก์แชร์จาก Google Maps มาวางได้เลย</small></label>
    <div className="block-display-settings map-height-settings">
      <div className="block-icon-choice-field">
        <span>ความสูง</span>
        <div className="block-icon-choice-options" role="group" aria-label="ความสูง" data-count={heights.length}>
          {heights.map((option) => <button key={option.value} type="button" title={option.label} aria-label={option.label} aria-pressed={config.height === option.value} className={config.height === option.value ? "selected" : ""} onClick={() => onChange({ ...config, height: option.value })}><span className="block-choice-visual" aria-hidden="true"><span className={`iframe-height-icon is-${option.value}`}/></span><span className="block-choice-caption">{option.label}</span></button>)}
        </div>
      </div>
    </div>
  </div>;
}

export function TimelineSettings({ config, onChange }: SettingsProps<"timeline">) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = config.items.find((item) => item.id === pendingDeleteId);
  const updateItem = (id: string, patch: Partial<(typeof config.items)[number]>) => onChange({ ...config, items: config.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const reorderItems = ({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return;
    const items = [...config.items];
    const [moved] = items.splice(source.index, 1);
    items.splice(destination.index, 0, moved);
    onChange({ ...config, items });
  };
  const confirmDelete = () => {
    if (!pendingDeleteId || config.items.length <= 1) return;
    onChange({ ...config, items: config.items.filter((item) => item.id !== pendingDeleteId) });
    setPendingDeleteId(null);
  };

  return <div className="extended-block-settings timeline-settings">
    <HeadingFields title={config.title} description={config.description} onChange={(value) => onChange({ ...config, ...value })}/>
    <div className="news-tabs-settings-heading timeline-settings-heading">
      <strong>รายการเหตุการณ์ ({config.items.length}/20)</strong>
      <button type="button" disabled={config.items.length >= 20} onClick={() => onChange({ ...config, items: [...config.items, { id: createId(), date: "", title: "เหตุการณ์ใหม่", description: "" }] })}><Plus size={13}/> เพิ่มเหตุการณ์</button>
    </div>
    <DragDropContext onDragEnd={reorderItems}>
      <Droppable droppableId="timeline-items">
        {(drop) => <div className="news-tabs-settings-list timeline-settings-list" ref={drop.innerRef} {...drop.droppableProps}>
          {config.items.map((item, index) => <Draggable key={item.id} draggableId={item.id} index={index}>
            {(drag, state) => <details ref={drag.innerRef} {...drag.draggableProps} className={state.isDragging ? "dragging" : ""}>
              <summary className="news-tab-setting-header">
                <span {...drag.dragHandleProps} title="ลากเพื่อจัดลำดับ" onClick={(event) => event.preventDefault()}><GripVertical size={15}/></span>
                <strong>เหตุการณ์ที่ {index + 1}</strong>
                <small>{item.title || item.date || "ยังไม่มีข้อมูล"}</small>
                <ChevronDown size={15}/>
              </summary>
              <div className="news-tab-settings-body timeline-item-fields">
                <label><span>ปีหรือวันที่</span><input value={item.date} placeholder="ปีหรือวันที่" onChange={(event) => updateItem(item.id, { date: event.target.value })}/></label>
                <label><span>หัวข้อเหตุการณ์</span><input value={item.title} placeholder="หัวข้อเหตุการณ์" onChange={(event) => updateItem(item.id, { title: event.target.value })}/></label>
                <label><span>รายละเอียด</span><textarea rows={2} value={item.description} placeholder="รายละเอียด" onChange={(event) => updateItem(item.id, { description: event.target.value })}/></label>
                <button type="button" className="remove-slide timeline-item-delete" disabled={config.items.length <= 1} onClick={() => setPendingDeleteId(item.id)}><Trash2 size={13}/> ลบเหตุการณ์</button>
              </div>
            </details>}
          </Draggable>)}
          {drop.placeholder}
        </div>}
      </Droppable>
    </DragDropContext>
    {pendingDelete ? <ConfirmDialog title="ลบเหตุการณ์?" description={`เหตุการณ์ “${pendingDelete.title || pendingDelete.date || "ยังไม่มีข้อมูล"}” จะถูกนำออกจาก Block ลำดับเหตุการณ์`} confirmLabel="ลบเหตุการณ์" onClose={() => setPendingDeleteId(null)} onConfirm={confirmDelete} layerClassName="timeline-delete-dialog-layer"/> : null}
  </div>;
}
