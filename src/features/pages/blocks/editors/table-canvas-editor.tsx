"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { BlockConfigMap } from "../config/types";
import { SecondaryRichText } from "../renderers/secondary-rich-text";

type TableConfig = BlockConfigMap["table"];
const minColumnWidth = 80;
const maxColumnWidth = 2000;
const actionColumnWidth = 48;
const clampWidth = (width: number) => Math.max(minColumnWidth, Math.min(maxColumnWidth, Math.round(width)));

export function TableCanvasEditor({ config, onChange }: {
  config: TableConfig;
  onChange: (config: TableConfig) => void;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const dragRef = useRef<{ pointerId: number; index: number; startX: number; startWidth: number; widths: number[]; latest: number[] } | null>(null);
  const [draftWidths, setDraftWidths] = useState<number[] | null>(null);
  const savedWidths = config.columnWidths.length === config.headers.length ? config.columnWidths : null;
  const visibleWidths = draftWidths ?? savedWidths;
  const fixedWidth = visibleWidths ? visibleWidths.reduce((total, width) => total + width, actionColumnWidth) : null;
  const visibleTableWidth = fixedWidth === null ? undefined : `min(100%, ${fixedWidth}px)`;

  const measuredWidths = () => savedWidths ? [...savedWidths] : Array.from(
    tableRef.current?.querySelectorAll<HTMLTableCellElement>("thead th:not(.table-canvas-row-action)") ?? [],
    (cell) => clampWidth(cell.getBoundingClientRect().width),
  );
  const startResize = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return;
    const widths = measuredWidths();
    if (widths.length !== config.headers.length) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, index, startX: event.clientX, startWidth: widths[index], widths, latest: widths };
    setDraftWidths(widths);
  };
  const moveResize = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const latest = [...drag.widths];
    latest[drag.index] = clampWidth(drag.startWidth + event.clientX - drag.startX);
    drag.latest = latest;
    setDraftWidths(latest);
  };
  const finishResize = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDraftWidths(null);
    if (event.type === "pointerup") onChange({ ...config, columnWidths: drag.latest });
  };
  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    event.stopPropagation();
    const widths = measuredWidths();
    if (widths.length !== config.headers.length) return;
    widths[index] = clampWidth(widths[index] + (event.key === "ArrowRight" ? 20 : -20));
    onChange({ ...config, columnWidths: widths });
  };

  const updateHeader = (index: number, value: string) => onChange({
    ...config,
    headers: config.headers.map((header, current) => current === index ? value : header),
  });
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => onChange({
    ...config,
    rows: config.rows.map((row, currentRow) => currentRow === rowIndex
      ? row.map((cell, currentColumn) => currentColumn === columnIndex ? value : cell)
      : row),
  });
  const addColumn = () => {
    if (config.headers.length >= 8) return;
    onChange({
      ...config,
      headers: [...config.headers, `หัวข้อที่ ${config.headers.length + 1}`],
      rows: config.rows.map((row) => [...row, ""]),
      columnWidths: savedWidths ? [...savedWidths, 170] : [],
    });
  };
  const removeColumn = (index: number) => {
    if (config.headers.length <= 1) return;
    onChange({
      ...config,
      headers: config.headers.filter((_, current) => current !== index),
      rows: config.rows.map((row) => row.filter((_, current) => current !== index)),
      columnWidths: savedWidths ? savedWidths.filter((_, current) => current !== index) : [],
    });
  };
  const addRow = () => {
    if (config.rows.length >= 30) return;
    onChange({ ...config, rows: [...config.rows, config.headers.map(() => "")] });
  };
  const removeRow = (index: number) => onChange({
    ...config,
    rows: config.rows.filter((_, current) => current !== index),
  });

  return (
    <div className={`content-table-block table-canvas-editor align-${config.align.split("-")[0]}`}>
      {config.caption ? <h2 className="content-table-title">{config.caption}</h2> : null}
      {config.description ? <div className="content-table-description"><SecondaryRichText value={config.description} /></div> : null}
      <div className="table-canvas-toolbar" style={{ width: visibleTableWidth }}>
        <span>คลิกช่องเพื่อแก้ไข · ลากเส้นหัวตารางเพื่อปรับความกว้าง · {config.headers.length} คอลัมน์ · {config.rows.length} แถว</span>
        <button type="button" onClick={addColumn} disabled={config.headers.length >= 8}>
          <Plus size={15} aria-hidden="true" /> เพิ่มคอลัมน์
        </button>
      </div>
      <div className={`content-table-wrap${fixedWidth === null ? "" : " is-fixed-width"}`}>
        <table ref={tableRef} className="content-table" style={{
          width: fixedWidth ?? "100%",
          minWidth: fixedWidth ?? Math.max(520, config.headers.length * 170 + actionColumnWidth),
          tableLayout: "fixed",
        }}>
          <colgroup>
            {config.headers.map((_, index) => <col key={index} style={visibleWidths ? { width: visibleWidths[index] } : undefined} />)}
            <col style={{ width: actionColumnWidth }} />
          </colgroup>
          <thead>
            <tr>
              {config.headers.map((header, columnIndex) => (
                <th key={columnIndex} scope="col">
                  <div className="table-canvas-header-cell">
                    <input
                      value={header}
                      placeholder={`หัวข้อที่ ${columnIndex + 1}`}
                      aria-label={`หัวข้อคอลัมน์ที่ ${columnIndex + 1}`}
                      onChange={(event) => updateHeader(columnIndex, event.target.value)}
                    />
                    <button type="button" className="table-canvas-remove" disabled={config.headers.length <= 1}
                      onClick={() => removeColumn(columnIndex)} aria-label={`ลบคอลัมน์ที่ ${columnIndex + 1}`} title="ลบคอลัมน์">
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <button type="button" className="table-canvas-resize-handle"
                      aria-label={`ปรับความกว้างคอลัมน์ที่ ${columnIndex + 1}`}
                      title="ลากเพื่อปรับความกว้างคอลัมน์ หรือใช้ปุ่มลูกศรซ้ายขวา"
                      onPointerDown={(event) => startResize(event, columnIndex)}
                      onPointerMove={moveResize}
                      onPointerUp={finishResize}
                      onPointerCancel={finishResize}
                      onKeyDown={(event) => resizeWithKeyboard(event, columnIndex)}
                    />
                  </div>
                </th>
              ))}
              <th className="table-canvas-row-action" aria-label="จัดการแถว" />
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, columnIndex) => (
                  <td key={columnIndex}>
                    <textarea
                      rows={2}
                      value={cell}
                      placeholder="กรอกข้อมูล"
                      aria-label={`แถวที่ ${rowIndex + 1} คอลัมน์ที่ ${columnIndex + 1}`}
                      onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                    />
                  </td>
                ))}
                <td className="table-canvas-row-action">
                  <button type="button" className="table-canvas-remove" onClick={() => removeRow(rowIndex)}
                    aria-label={`ลบแถวที่ ${rowIndex + 1}`} title="ลบแถว">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-canvas-footer" style={{ width: visibleTableWidth }}>
        <button type="button" onClick={addRow} disabled={config.rows.length >= 30}>
          <Plus size={15} aria-hidden="true" /> เพิ่มแถว
        </button>
        <small>สูงสุด 8 คอลัมน์ · 30 แถว</small>
      </div>
    </div>
  );
}
