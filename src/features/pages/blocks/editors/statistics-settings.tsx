"use client";

import { createId } from "@/utils/create-id";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { navigationIconNames, type NavigationIconName } from "@/features/navigation/icon-names";
import { NavigationIcon, navigationIcons } from "@/features/navigation/navigation-icons";
import type { BlockConfigMap } from "../config/types";

type StatisticItem = BlockConfigMap["statistics"]["items"][number];

export function StatisticsSettings({ config, onChange }: {
  config: BlockConfigMap["statistics"];
  onChange: (config: BlockConfigMap["statistics"]) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDelete = config.items.find((item) => item.id === pendingDeleteId);

  const updateItem = (id: string, patch: Partial<StatisticItem>) => onChange({
    ...config,
    items: config.items.map((item) => item.id === id ? { ...item, ...patch } : item),
  });

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

  return (
    <div className="statistics-settings">
      <label><span>หัวข้อ</span><input value={config.title} onChange={(event) => onChange({ ...config, title: event.target.value })} /></label>
      <label><span>คำอธิบาย</span><textarea rows={3} value={config.description} onChange={(event) => onChange({ ...config, description: event.target.value })} /></label>
      <div className="block-display-settings statistics-columns-settings">
        <div className="block-icon-choice-field">
          <span>จำนวนคอลัมน์</span>
          <div className="block-icon-choice-options" data-count="3">
            {([2, 3, 4] as const).map((columns) => (
              <button
                key={columns}
                type="button"
                title={`${columns} คอลัมน์`}
                aria-label={`${columns} คอลัมน์`}
                aria-pressed={config.columns === columns}
                className={config.columns === columns ? "selected" : ""}
                onClick={() => onChange({ ...config, columns })}
              >
                <span className="block-choice-visual" aria-hidden="true">
                  <span className={`statistics-columns-icon is-${columns}`}>
                    {Array.from({ length: columns }, (_, index) => <i key={index} />)}
                  </span>
                </span>
                <span className="block-choice-caption">{columns} คอลัมน์</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="news-tabs-settings-heading">
        <strong>รายการสถิติ ({config.items.length}/12)</strong>
        <button type="button" disabled={config.items.length >= 12} onClick={() => onChange({
          ...config,
          items: [...config.items, { id: createId(), value: "0", label: "รายการใหม่", description: "", icon: "activity" }],
        })}><Plus size={13} /> เพิ่มรายการ</button>
      </div>
      <DragDropContext onDragEnd={reorderItems}>
        <Droppable droppableId="statistics-items">
          {(drop) => (
            <div className="news-tabs-settings-list statistics-settings-list" ref={drop.innerRef} {...drop.droppableProps}>
              {config.items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(drag, state) => (
                    <details ref={drag.innerRef} {...drag.draggableProps} className={state.isDragging ? "dragging" : ""}>
                      <summary className="news-tab-setting-header">
                        <span {...drag.dragHandleProps} title="ลากเพื่อจัดลำดับ" onClick={(event) => event.preventDefault()}><GripVertical size={15} /></span>
                        <strong>รายการที่ {index + 1}</strong><small>{item.label || "ยังไม่มีชื่อ"}</small><ChevronDown size={15} />
                      </summary>
                      <div className="news-tab-settings-body statistics-item-fields">
                        <div>
                          <label><span>ตัวเลข</span><input value={item.value} onChange={(event) => updateItem(item.id, { value: event.target.value })} /></label>
                          <label><span>หน่วยหรือชื่อ</span><input value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} /></label>
                        </div>
                        <label><span>คำอธิบายสั้น</span><input value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} /></label>
                        <StatisticIconPicker value={item.icon} onChange={(icon) => updateItem(item.id, { icon })} />
                        <button type="button" className="remove-slide statistics-item-delete" disabled={config.items.length <= 1} onClick={() => setPendingDeleteId(item.id)}>
                          <Trash2 size={13} /> ลบรายการ
                        </button>
                      </div>
                    </details>
                  )}
                </Draggable>
              ))}
              {drop.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {pendingDelete ? <ConfirmDialog
        title="ลบรายการสถิติ?"
        description={`รายการ “${pendingDelete.label || "ยังไม่มีชื่อ"}” จะถูกนำออกจาก Block สถิติสำคัญ`}
        confirmLabel="ลบรายการ"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        layerClassName="statistics-delete-dialog-layer"
      /> : null}
    </div>
  );
}

function StatisticIconPicker({ value, onChange }: { value: NavigationIconName; onChange: (value: NavigationIconName) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOutside);
    const stopDismissal = listenForDropdownDismissal(
      () => detailsRef.current?.querySelector(".navigation-icon-grid"),
      (target) => target instanceof Node && Boolean(detailsRef.current?.contains(target)),
      () => detailsRef.current?.removeAttribute("open"),
    );
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      stopDismissal();
    };
  }, []);

  return <div className="navigation-icon-field statistics-icon-field">
    <span>ไอคอน</span>
    <details ref={detailsRef} className="navigation-icon-picker" onKeyDown={(event) => {
      if (event.key === "Escape") { detailsRef.current?.removeAttribute("open"); detailsRef.current?.querySelector("summary")?.focus(); }
    }}>
      <summary><span><NavigationIcon name={value} size={18} />{navigationIcons[value].label}</span><ChevronDown size={17} /></summary>
      <div className="navigation-icon-grid" aria-label="เลือกไอคอนรายการสถิติ">
        {navigationIconNames.map((name) => <button key={name} type="button" className={value === name ? "selected" : ""} aria-label={navigationIcons[name].label} aria-pressed={value === name} title={navigationIcons[name].label} onClick={() => { onChange(name); detailsRef.current?.removeAttribute("open"); }}>
          <NavigationIcon name={name} size={21} /><small>{navigationIcons[name].label}</small>
        </button>)}
      </div>
    </details>
  </div>;
}
