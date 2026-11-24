"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Download, Upload } from "lucide-react";
import type { ImportPreview } from "@/server/auth/user-import";
import "./users-import.css";

export function UsersImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const errorGroups = preview?.errors.reduce<Map<number, string[]>>((groups, issue) => {
    groups.set(issue.row, [...(groups.get(issue.row) ?? []), issue.message]);
    return groups;
  }, new Map()) ?? new Map<number, string[]>();
  useLayoutEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFile(null);
    setPreview(null);
    setBusy(false);
    setError("");
    setCreated(null);
    setExpandedRows(new Set());
  }, []);
  async function submit(mode: "preview" | "commit") {
    if (!file) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("mode", mode);
      const response = await fetch("/api/users/import", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) { setPreview(null); setError(result.error ?? "ดำเนินการไม่สำเร็จ"); return; }
      setPreview(result);
      const errorRows = [...new Set((result as ImportPreview).errors.map((issue) => issue.row))];
      setExpandedRows(new Set(errorRows.length <= 3 ? errorRows : [errorRows[0]]));
      if (mode === "commit" && result.created > 0) setCreated(result.created);
      else if (mode === "commit" && result.errors.length) setError("ข้อมูลเปลี่ยนแปลง กรุณาแก้ไขและตรวจสอบใหม่");
    } catch { if (!controller.signal.aborted) setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่"); }
    finally { if (requestRef.current === controller) requestRef.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return <main className="users-import-page">
    <Link className="users-import-back" href="/admin/users"><ArrowLeft size={17}/>กลับไปบัญชีผู้ใช้งาน</Link>
    <h1>นำเข้าบุคลากรจาก Excel</h1>
    <p className="users-import-intro">ดาวน์โหลดแบบฟอร์ม กรอกข้อมูล แล้วตรวจสอบทุกแถวก่อนยืนยันสร้างบัญชี</p>
    {created !== null ? <section className="users-import-card users-import-success"><h2>นำเข้าสำเร็จ</h2><p>สร้างบัญชีบุคลากร {created} รายการแล้ว ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งแรก</p><Link className="primary-button" href="/admin/users">ดูบัญชีผู้ใช้งาน</Link></section> : <>
      <section className="users-import-card">
        <h2>1. ดาวน์โหลดแบบฟอร์ม</h2>
        <Link className="users-import-download" href="/api/users/import/template"><Download size={17}/>ดาวน์โหลดแบบฟอร์ม Excel</Link>
        <div className="users-import-guide">
          <h3>วิธีกรอกข้อมูล</h3>
          <ol>
            <li><strong>ชื่อบุคลากร</strong><span>กรอกชื่อ–นามสกุลไทยและอังกฤษ คำนำหน้าชื่อไทยกรอกอิสระได้ เช่น นาย หรือ พญ. ระบบจะนำมารวมเป็นชื่อที่แสดง</span></li>
            <li><strong>ข้อมูลสังกัด</strong><span>ประเภทบุคลากร ตำแหน่ง ระดับ และหน่วยงาน/กลุ่มงาน เว้นว่างได้ หากกรอกต้องใช้ชื่อตามชีต “ตัวเลือกจากระบบ”</span></li>
            <li><strong>รหัสตั้งต้น</strong><span>อย่างน้อย 10 ตัวอักษร โดยมีตัวใหญ่ ตัวเล็ก ตัวเลข และสัญลักษณ์ ผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก</span></li>
            <li><strong>ชื่อผู้ใช้</strong><span>ระบบสร้างจากชื่ออังกฤษ ตามด้วยจุดและอักษรนามสกุลอังกฤษอย่างน้อย 2 ตัว เช่น somchai.su</span></li>
          </ol>
        </div>
      </section>
      <section className="users-import-card"><h2>2. เลือกไฟล์และตรวจสอบ</h2><label className="users-import-file"><Upload size={20}/><span>{file?.name ?? "เลือกไฟล์ .xlsx (ไม่เกิน 2 MB, 500 รายการ)"}</span><input ref={fileInputRef} type="file" accept=".xlsx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setExpandedRows(new Set()); setCreated(null); setError(""); }}/></label><button className="primary-button" disabled={!file || busy} onClick={() => submit("preview")}>{busy ? "กำลังตรวจสอบ…" : "ตรวจสอบข้อมูล"}</button></section>
      {error && <div className="users-import-error" role="alert">{error}</div>}
      {preview && <section className="users-import-card">
        <h2>3. ผลตรวจสอบ</h2>
        <div className="users-import-result-summary">
          <p>{preview.errors.length ? `พบ ${errorGroups.size} แถวที่ต้องแก้ · ${preview.errors.length} ข้อผิดพลาด` : `ตรวจสอบผ่าน ${preview.rows.length} รายการ`}</p>
          {preview.errors.length ? <button type="button" onClick={() => setExpandedRows(expandedRows.size === errorGroups.size ? new Set() : new Set(errorGroups.keys()))}>{expandedRows.size === errorGroups.size ? "พับทั้งหมด" : "ขยายทั้งหมด"}</button> : null}
        </div>
        {preview.errors.length ? <>
          <div className="users-import-error-list" role="group" aria-label="ข้อผิดพลาดจากไฟล์ Excel">
            {[...errorGroups].map(([row, messages]) => {
              const open = expandedRows.has(row);
              const name = preview.rows.find((item) => item.row === row)?.displayName;
              return <div className="users-import-error-group" key={row}>
                <button type="button" className="users-import-error-heading" aria-expanded={open} onClick={() => setExpandedRows((current) => { const next = new Set(current); if (next.has(row)) next.delete(row); else next.add(row); return next; })}>
                  <strong className="users-import-error-row">แถว {row}</strong>
                  {name ? <span className="users-import-error-name">{name}</span> : null}
                  <span className="users-import-error-count">{messages.length} ข้อผิดพลาด <ChevronDown size={16} className={open ? "is-open" : ""}/></span>
                </button>
                {open ? <ul>{messages.map((message, index) => <li key={index}>{message}</li>)}</ul> : null}
              </div>;
            })}
          </div>
          <p>กรุณาแก้ไขไฟล์ แล้วเลือกไฟล์ใหม่เพื่อตรวจสอบอีกครั้ง จะยังไม่มีบัญชีใดถูกสร้าง</p>
        </> : <>
          <div className="users-import-table"><table><thead><tr><th>แถว</th><th>ชื่อ–นามสกุล</th><th>ชื่อผู้ใช้ที่จะสร้าง</th></tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.displayName}</td><td>{row.username}</td></tr>)}</tbody></table></div>
          <button className="primary-button" disabled={busy} onClick={() => submit("commit")}>{busy ? "กำลังนำเข้า…" : `ยืนยันนำเข้า ${preview.rows.length} รายการ`}</button>
        </>}
      </section>}
    </>}
  </main>;
}
