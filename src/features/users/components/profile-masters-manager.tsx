"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleCheck, CircleOff, ListOrdered, LoaderCircle, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ActionToast } from "@/components/admin/action-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createProfileMasterAction, deleteProfileMasterAction, moveProfileMasterAction, updateProfileMasterAction, type UserActionResult } from "../actions";

type Kind = "PERSON_TYPE" | "POSITION" | "LEVEL";
type Master = { id: string; kind: Kind; name: string; active: boolean; sortOrder: number; usage: number };
const labels: Record<Kind, string> = { PERSON_TYPE: "ประเภทบุคลากร", POSITION: "ตำแหน่ง", LEVEL: "ระดับ" };
const pageSize = 10;

function paginationItems(current: number, total: number) {
  if (total <= 9) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, 2, current - 1, current, current + 1, total - 1, total])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
}

export function ProfileMastersManager({ masters }: { masters: Master[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("PERSON_TYPE");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const [toggling, setToggling] = useState<Master | null>(null);
  const [deleting, setDeleting] = useState<Master | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState<UserActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const allInKind = masters.filter((item) => item.kind === kind);
  const items = allInKind.filter((item) => item.name.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th")));
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = paginationItems(safePage, pageCount);
  function run(action: (data: FormData) => Promise<UserActionResult>, data: FormData, done?: () => void, onError?: (message: string) => void) {
    setToast(null);
    startTransition(async () => { const result = await action(data); if (!result.ok && onError) { onError(result.message); return; } setToast(result); if (result.ok) { done?.(); router.refresh(); } });
  }
  function showNameError(message: string, input?: HTMLInputElement | null) {
    setDialogError(message);
    window.requestAnimationFrame(() => (input ?? document.querySelector<HTMLInputElement>('.profile-master-dialog input[name="name"]'))?.focus());
  }
  function submitDialog(event: FormEvent<HTMLFormElement>, mode: "add" | "edit") {
    event.preventDefault();
    const nameInput = event.currentTarget.querySelector<HTMLInputElement>('input[name="name"]');
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) { showNameError("กรุณากรอกชื่อรายการ", nameInput); return; }
    if (allInKind.some((item) => item.id !== editing?.id && item.name.toLocaleLowerCase("th") === name.toLocaleLowerCase("th"))) { showNameError("มีชื่อรายการนี้แล้ว", nameInput); return; }
    setDialogError("");
    if (mode === "add") { data.set("kind", kind); run(createProfileMasterAction, data, () => setAddOpen(false), (message) => showNameError(message, nameInput)); return; }
    if (!editing) return;
    data.set("id", editing.id); data.set("mode", "rename"); run(updateProfileMasterAction, data, () => setEditing(null), (message) => showNameError(message, nameInput));
  }
  function move(item: Master, direction: "up" | "down") {
    const data = new FormData(); data.set("id", item.id); data.set("direction", direction); run(moveProfileMasterAction, data);
  }
  function confirmToggle() {
    if (!toggling) return;
    const data = new FormData(); data.set("id", toggling.id); data.set("mode", "active"); data.set("active", String(!toggling.active));
    run(updateProfileMasterAction, data, () => setToggling(null));
  }

  return <main className="category-manager profile-masters-manager">
    <header><h1>ข้อมูลบุคลากร</h1><p>จัดการตัวเลือกประเภทบุคลากร ตำแหน่ง และระดับสำหรับโปรไฟล์ผู้ใช้</p></header>
    {toast ? <ActionToast ok={toast.ok} title={toast.ok ? "ดำเนินการสำเร็จ" : "ดำเนินการไม่สำเร็จ"} description={toast.message} onClose={() => setToast(null)}/> : null}
    <nav aria-label="ประเภทข้อมูลบุคลากร">{(Object.keys(labels) as Kind[]).map((value) => <button key={value} type="button" className={kind === value ? "active" : ""} onClick={() => { setKind(value); setSearch(""); setPage(1); }}>{labels[value]}</button>)}</nav>
    <section className="category-manager-card">
      <div className="category-manager-toolbar"><div><h2>{labels[kind]}</h2><p>ทั้งหมด {allInKind.length} รายการ · พบ {items.length} รายการ</p></div><button className="primary-button" type="button" onClick={() => { setDialogError(""); setAddOpen(true); }}><Plus size={17}/> เพิ่มรายการ</button></div>
      <div className="category-manager-search"><Search size={18}/><input type="search" placeholder={`ค้นหา${labels[kind]}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></div>
      {search.trim() ? <p className="category-manager-filter-note">ล้างคำค้นหาก่อนจัดลำดับ เพื่อให้เห็นรายการทั้งหมด</p> : null}
      <div className="category-manager-table-scroll"><div className="category-manager-table profile-master-table" role="table">
        <div className="category-manager-table-head category-manager-table-row" role="row"><span>ลำดับ</span><span>ชื่อรายการ</span><span>ผู้ใช้งาน</span><span>สถานะ</span><span>จัดการ</span></div>
        <div className="category-manager-list">{visibleItems.map((item) => {
          const absoluteIndex = allInKind.findIndex((entry) => entry.id === item.id);
          return <div className="category-manager-table-row category-manager-row" role="row" key={item.id}><div className="category-arrow-order"><span>{absoluteIndex + 1}</span><div><button type="button" disabled={pending || absoluteIndex <= 0 || Boolean(search)} aria-label={`เลื่อน ${item.name} ขึ้น`} title={search ? "ล้างคำค้นหาก่อนจัดลำดับ" : "เลื่อนขึ้น"} onClick={() => move(item, "up")}><ChevronUp size={14}/></button><button type="button" disabled={pending || absoluteIndex >= allInKind.length - 1 || Boolean(search)} aria-label={`เลื่อน ${item.name} ลง`} title={search ? "ล้างคำค้นหาก่อนจัดลำดับ" : "เลื่อนลง"} onClick={() => move(item, "down")}><ChevronDown size={14}/></button></div></div><div className="category-manager-name"><strong>{item.name}</strong></div><div>{item.usage} บัญชี</div><div><span className={`category-manager-status${item.active ? " active" : ""}`}>{item.active ? "ใช้งาน" : "ปิดใช้งาน"}</span></div><div className="category-manager-actions category-icon-actions"><button type="button" title="เปลี่ยนชื่อ" aria-label={`เปลี่ยนชื่อ ${item.name}`} onClick={() => { setDialogError(""); setEditing(item); }}><Pencil size={15}/></button><button type="button" className={item.active ? "category-disable" : "category-enable"} disabled={pending} title={item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} aria-label={`${item.active ? "ปิด" : "เปิด"}ใช้งาน ${item.name}`} onClick={() => setToggling(item)}>{item.active ? <CircleOff size={16}/> : <CircleCheck size={16}/>}</button><button type="button" className="category-manager-delete" disabled={item.usage > 0 || pending} title={item.usage ? "รายการนี้มีผู้ใช้งานอยู่" : "ลบรายการ"} aria-label={`ลบ ${item.name}`} onClick={() => setDeleting(item)}><Trash2 size={16}/></button></div></div>;
        })}{!items.length ? <p className="category-manager-empty">ไม่พบรายการ</p> : null}</div>
      </div></div>
      {items.length ? <div className="pages-pagination documents-pagination category-pagination">
        <p>แสดง {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, items.length)} จาก {items.length} รายการ</p>
        <nav className="documents-pagination-full" aria-label={`เปลี่ยนหน้า${labels[kind]}`}>
          <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></button>
          {pageNumbers.map((pageNumber, index) => <span key={pageNumber}>
            {index > 0 && pageNumber - pageNumbers[index - 1] > 1 ? <i>…</i> : null}
            <button type="button" className={pageNumber === safePage ? "active" : ""} aria-current={pageNumber === safePage ? "page" : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
          </span>)}
          <button type="button" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></button>
        </nav>
        <nav className="documents-pagination-compact" aria-label={`เปลี่ยนหน้า${labels[kind]}บนจอแคบ`}>
          <button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></button>
          <span className="documents-pagination-current" aria-live="polite">หน้า {safePage} จาก {pageCount}</span>
          <button type="button" disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></button>
        </nav>
      </div> : null}
    </section>
    {addOpen ? <MasterDialog title={`เพิ่ม${labels[kind]}`} kindLabel={labels[kind]} onClose={() => setAddOpen(false)}><form noValidate onSubmit={(event) => submitDialog(event, "add")}><label><span>ชื่อรายการ <em className="admin-required-mark" aria-hidden="true">*</em></span><input name="name" autoFocus maxLength={160} placeholder={`กรอกชื่อ${labels[kind]}`} aria-invalid={Boolean(dialogError)} aria-describedby={dialogError ? "profile-master-name-error" : undefined} onChange={() => setDialogError("")}/>{dialogError ? <small id="profile-master-name-error" className="profile-master-field-error" role="alert">{dialogError}</small> : <small>รายการใหม่จะถูกเพิ่มต่อท้าย และสามารถจัดลำดับภายหลังได้</small>}</label><footer><button type="button" onClick={() => setAddOpen(false)}>ยกเลิก</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="profile-submit-spinner" size={16}/> : <Plus size={16}/>} {pending ? "กำลังเพิ่ม..." : "เพิ่มรายการ"}</button></footer></form></MasterDialog> : null}
    {editing ? <MasterDialog title={`เปลี่ยนชื่อ${labels[editing.kind]}`} kindLabel={labels[editing.kind]} onClose={() => setEditing(null)}><form noValidate onSubmit={(event) => submitDialog(event, "edit")}><label><span>ชื่อรายการ <em className="admin-required-mark" aria-hidden="true">*</em></span><input name="name" defaultValue={editing.name} autoFocus maxLength={160} aria-invalid={Boolean(dialogError)} aria-describedby={dialogError ? "profile-master-name-error" : undefined} onChange={() => setDialogError("")}/>{dialogError ? <small id="profile-master-name-error" className="profile-master-field-error" role="alert">{dialogError}</small> : null}</label><footer><button type="button" onClick={() => setEditing(null)}>ยกเลิก</button><button className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="profile-submit-spinner" size={16}/> : null}{pending ? "กำลังบันทึก..." : "บันทึก"}</button></footer></form></MasterDialog> : null}
    {toggling ? <ConfirmDialog variant="default" title={`${toggling.active ? "ปิด" : "เปิด"}ใช้งาน “${toggling.name}”?`} description={toggling.active ? "รายการนี้จะไม่ปรากฏเป็นตัวเลือกใหม่ในโปรไฟล์ผู้ใช้ แต่ข้อมูลเดิมจะยังคงอยู่" : "รายการนี้จะกลับมาเป็นตัวเลือกในโปรไฟล์ผู้ใช้"} confirmLabel={toggling.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} onClose={() => setToggling(null)} onConfirm={confirmToggle}/> : null}
    {deleting ? <ConfirmDialog title={`ลบ “${deleting.name}”?`} description="รายการที่ลบแล้วไม่สามารถเรียกคืนได้" confirmLabel="ลบรายการ" onClose={() => setDeleting(null)} onConfirm={() => { const data = new FormData(); data.set("id", deleting.id); run(deleteProfileMasterAction, data, () => setDeleting(null)); }}/> : null}
  </main>;
}

function MasterDialog({ title, kindLabel, onClose, children }: { title: string; kindLabel: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-layer"><button className="modal-backdrop" type="button" aria-label="ปิด" onClick={onClose}/><div className="category-add-dialog profile-master-dialog" role="dialog" aria-modal="true"><header><span><ListOrdered size={21}/></span><div><h2>{title}</h2><p>ใช้เป็นตัวเลือกในช่อง “{kindLabel}” ของโปรไฟล์ผู้ใช้</p></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={18}/></button></header>{children}</div></div>;
}
