"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import { showGlobalToast } from "@/components/ui/global-toast";
import { ChevronDown, ChevronUp, CircleCheck, CircleOff, LoaderCircle, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminListLoadingRows } from "@/components/admin/admin-content-loading";
import { readPosts, refreshPosts } from "@/features/news/demo/storage";
import { readDocuments, refreshDocuments } from "@/features/documents/demo/storage";
import { categoriesChangedEvent, readCategories, refreshCategories, setCategories as updateCategoryCache } from "../demo/storage";
import type { CategoryScope, DemoCategory } from "../types";

const scopeLabels: Record<CategoryScope, string> = { posts: "ข่าว", documents: "เอกสาร" };



export function CategoryManager({ initialScope }: { initialScope: CategoryScope }) {
  const [scope, setScope] = useState<CategoryScope>(initialScope);
  const [categories, setCategories] = useState<DemoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DemoCategory | null>(null);
  const [toggling, setToggling] = useState<DemoCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogError, setDialogError] = useState("");
  const [pending, setPending] = useState(false);
  const mutationPending = useRef(false);
  const [usage, setUsage] = useState<Record<string, number>>({});

  function notify(variant: "success" | "error", title: string, description: string) {
    showGlobalToast({ variant, title, description });
  }

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setCategories(readCategories(scope));
      const items = scope === "posts" ? readPosts(true) : readDocuments(true);
      setUsage(items.reduce<Record<string, number>>((counts, item) => { counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1; return counts; }, {}));
    };
    const timer = window.setTimeout(refresh, 0);
    if (scope === "posts") void refreshPosts(true).catch(() => undefined);
    if (scope === "documents") void refreshDocuments(true).catch(() => undefined);
    void refreshCategories(scope)
      .catch(() => { if (active) notify("error", "โหลดหมวดหมู่ไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง"); })
      .finally(() => { if (active) setLoading(false); });
    window.addEventListener(categoriesChangedEvent, refresh);
    window.addEventListener("hos-posts-change", refresh);
    window.addEventListener("hos-documents-change", refresh);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener(categoriesChangedEvent, refresh); window.removeEventListener("hos-posts-change", refresh); window.removeEventListener("hos-documents-change", refresh); };
  }, [scope]);

  async function mutate(action: string, fields: Record<string, unknown>): Promise<boolean> {
    if (mutationPending.current) return false;
    mutationPending.current = true;
    setPending(true);
    try {
      const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope, action, ...fields }) });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "บันทึกหมวดหมู่ไม่สำเร็จ";
        throw new Error(message);
      }
      if (!Array.isArray(payload)) throw new Error("ข้อมูลหมวดหมู่ไม่ถูกต้อง");
      const updated = payload as DemoCategory[];
      updateCategoryCache(scope, updated);
      setCategories(updated);
      return true;
    } catch (error) {
      notify("error", "บันทึกไม่สำเร็จ", error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง");
      return false;
    } finally { mutationPending.current = false; setPending(false); }
  }

  async function submitName(event: FormEvent<HTMLFormElement>, mode: "add" | "edit") {
    event.preventDefault();
    const nameInput = event.currentTarget.querySelector<HTMLInputElement>('input[name="name"]');
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) { setDialogError("กรุณากรอกชื่อหมวดหมู่"); nameInput?.focus(); return; }
    const duplicate = categories.some((item) => item.id !== editing?.id && item.name.toLocaleLowerCase("th") === name.toLocaleLowerCase("th"));
    if (duplicate) { setDialogError("มีชื่อหมวดหมู่นี้แล้ว"); nameInput?.focus(); return; }
    setDialogError("");
    if (mode === "add") {
      if (await mutate("create", { name })) { setAddOpen(false); notify("success", "เพิ่มหมวดหมู่แล้ว", `เพิ่ม “${name}” เรียบร้อย`); }
      return;
    }
    if (editing && await mutate("rename", { id: editing.id, name })) { setEditing(null); notify("success", "เปลี่ยนชื่อหมวดหมู่แล้ว", `เปลี่ยนเป็น “${name}” เรียบร้อย`); }
  }

  async function confirmToggle() {
    if (!toggling) return;
    if (toggling.active && usage[toggling.id]) { setToggling(null); notify("error", "ปิดใช้งานไม่สำเร็จ", "หมวดหมู่นี้ยังมีเนื้อหาใช้อยู่ กรุณาย้ายเนื้อหาก่อน"); return; }
    if (await mutate("setActive", { id: toggling.id, active: !toggling.active })) {
      notify("success", toggling.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว", `หมวดหมู่ “${toggling.name}” ${toggling.active ? "ปิด" : "เปิด"}ใช้งานเรียบร้อย`);
      setToggling(null);
    }
  }

  async function move(item: DemoCategory, direction: "up" | "down") {
    const index = categories.findIndex((entry) => entry.id === item.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= categories.length) return;
    const next = [...categories]; [next[index], next[target]] = [next[target], next[index]];
    if (await mutate("reorder", { ids: next.map((entry) => entry.id) })) notify("success", "จัดลำดับแล้ว", `เลื่อน “${item.name}”${direction === "up" ? "ขึ้น" : "ลง"}เรียบร้อย`);
  }

  async function removeCategory() {
    const target = categories.find((item) => item.id === deleteId);
    if (!target) { setDeleteId(null); return; }
    if (usage[target.id]) { setDeleteId(null); notify("error", "ลบหมวดหมู่ไม่สำเร็จ", "หมวดหมู่นี้มีเนื้อหาใช้งานอยู่ กรุณาย้ายเนื้อหาก่อน"); return; }
    if (await mutate("delete", { id: target.id })) { setDeleteId(null); notify("success", "ลบหมวดหมู่แล้ว", `ลบ “${target.name}” เรียบร้อย`); }
  }

  const searching = Boolean(search.trim());
  const filtered = categories.filter((item) => item.name.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th")));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);


  return <><main className="category-manager">
    <header><div><h1>จัดการหมวดหมู่</h1><p>หมวดหมู่ใช้ร่วมกันในหน้าสร้างเนื้อหา หน้า public และบล็อก Page Builder</p></div><button type="button" className="primary-button" onClick={() => { setDialogError(""); setAddOpen(true); }}><Plus size={17}/> เพิ่มหมวดหมู่</button></header>
    <nav aria-label="ประเภทหมวดหมู่">{(["posts", "documents"] as const).map((item) => <button key={item} type="button" disabled={pending} className={scope === item ? "active" : ""} onClick={() => { if (item === scope) return; setLoading(true); setCategories([]); setUsage({}); setScope(item); setSearch(""); setPage(1); setDeleteId(null); window.history.replaceState(null, "", `/admin/categories?scope=${item}`); }}>หมวดหมู่{scopeLabels[item]}</button>)}</nav>
    <div className="category-manager-search"><Search size={18}/><input type="search" aria-label={`ค้นหาหมวดหมู่${scopeLabels[scope]}`} placeholder="ค้นหาชื่อหมวดหมู่" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></div>
    {searching ? <p className="category-manager-filter-note">ล้างคำค้นหาก่อนจัดลำดับ เพื่อให้เห็นรายการทั้งหมด</p> : null}
    <section className="category-list-table admin-data-table">
      <div className="admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางหมวดหมู่ เลื่อนซ้ายขวาได้"><div className="category-manager-table admin-data-grid" role="table" aria-busy={loading} aria-label={`รายการหมวดหมู่${scopeLabels[scope]}`}>
        <div className="category-manager-table-head category-manager-table-row" role="row"><span>ลำดับ</span><span>ชื่อหมวดหมู่</span><span>เนื้อหา</span><span>สถานะ</span><span>จัดการ</span></div>
        <div className="category-manager-list" role="rowgroup">{loading ? <AdminListLoadingRows columns={5} rowClassName="category-manager-table-row"/> : visible.map((item) => {
          const index = categories.findIndex((entry) => entry.id === item.id);
          return <div role="row" className="category-manager-table-row category-manager-row" key={item.id}>
            <div role="cell" className="category-arrow-order"><span>{index + 1}</span><div><button type="button" disabled={pending || searching || index === 0} title={searching ? "ล้างคำค้นหาก่อนจัดลำดับ" : "เลื่อนขึ้น"} aria-label={`เลื่อน ${item.name} ขึ้น`} onClick={() => void move(item, "up")}><ChevronUp size={14}/></button><button type="button" disabled={pending || searching || index === categories.length - 1} title={searching ? "ล้างคำค้นหาก่อนจัดลำดับ" : "เลื่อนลง"} aria-label={`เลื่อน ${item.name} ลง`} onClick={() => void move(item, "down")}><ChevronDown size={14}/></button></div></div>
            <div role="cell" className="category-manager-name"><strong>{item.name}</strong></div>
            <div role="cell" className="category-manager-count">{usage[item.id] ?? 0} รายการ</div>
            <div role="cell"><span className={`category-manager-status${item.active ? " active" : ""}`}>{item.active ? "ใช้งาน" : "ปิดใช้งาน"}</span></div>
            <div role="cell" className="category-manager-actions category-icon-actions"><button type="button" title="เปลี่ยนชื่อ" aria-label={`เปลี่ยนชื่อ ${item.name}`} onClick={() => { setDialogError(""); setEditing(item); }}><Pencil size={15}/></button><button type="button" className={item.active ? "category-disable" : "category-enable"} title={item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} aria-label={`${item.active ? "ปิด" : "เปิด"}ใช้งาน ${item.name}`} onClick={() => setToggling(item)}>{item.active ? <CircleOff size={16}/> : <CircleCheck size={16}/>}</button><button type="button" className="category-manager-delete" onClick={() => setDeleteId(item.id)} disabled={(usage[item.id] ?? 0) > 0 || pending} title={(usage[item.id] ?? 0) > 0 ? "ย้ายเนื้อหาออกจากหมวดหมู่นี้ก่อนลบ" : "ลบหมวดหมู่"} aria-label={`ลบหมวดหมู่ ${item.name}`}><Trash2 size={16}/></button></div>
          </div>;
        })}{!loading && !filtered.length ? <p className="category-manager-empty">{searching ? "ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา" : "ยังไม่มีหมวดหมู่"}</p> : null}</div>
      </div></div>
      {!loading && filtered.length ? <AdminTablePagination className="category-list-pagination" page={safePage} pageCount={pageCount} pageSize={pageSize} total={filtered.length} label={`เปลี่ยนหน้าหมวดหมู่${scopeLabels[scope]}`} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}/> : null}
    </section>
  </main>
  {addOpen ? <CategoryDialog title={`เพิ่มหมวดหมู่${scopeLabels[scope]}`} description="ตั้งชื่อให้สั้นและชัดเจน เพื่อใช้จัดกลุ่มเนื้อหา" submitLabel="เพิ่มหมวดหมู่" defaultName="" error={dialogError} pending={pending} onNameChange={() => setDialogError("")} onClose={() => setAddOpen(false)} onSubmit={(event) => void submitName(event, "add")}/> : null}
  {editing ? <CategoryDialog title="เปลี่ยนชื่อหมวดหมู่" description={`แก้ไขชื่อ “${editing.name}” โดยไม่กระทบเนื้อหาที่ใช้งานอยู่`} submitLabel="บันทึกชื่อ" defaultName={editing.name} error={dialogError} pending={pending} onNameChange={() => setDialogError("")} onClose={() => setEditing(null)} onSubmit={(event) => void submitName(event, "edit")}/> : null}
  {toggling ? <ConfirmDialog variant="default" title={`${toggling.active ? "ปิด" : "เปิด"}ใช้งาน “${toggling.name}”?`} description={toggling.active ? "รายการนี้จะไม่ปรากฏเป็นตัวเลือกสำหรับเนื้อหาใหม่" : "รายการนี้จะกลับมาใช้เป็นตัวเลือกสำหรับเนื้อหาใหม่"} confirmLabel={toggling.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} onClose={() => setToggling(null)} onConfirm={() => void confirmToggle()}/> : null}
  {deleteId ? <ConfirmDialog title={`ลบหมวดหมู่ “${categories.find((item) => item.id === deleteId)?.name ?? ""}”?`} description="การลบหมวดหมู่จะย้อนกลับไม่ได้" confirmLabel="ลบหมวดหมู่" onClose={() => setDeleteId(null)} onConfirm={() => void removeCategory()}/> : null}
  </>;
}

function CategoryDialog({ title, description, submitLabel, defaultName, error, pending, onNameChange, onClose, onSubmit }: { title: string; description: string; submitLabel: string; defaultName: string; error: string; pending: boolean; onNameChange: () => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-layer" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }}><button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่าง" onClick={onClose}/><div className="category-add-dialog category-form-dialog" role="dialog" aria-modal="true"><header><span><Tags size={21}/></span><div><h2>{title}</h2><p>{description}</p></div><button type="button" aria-label="ปิด" disabled={pending} onClick={onClose}><X size={18}/></button></header><form noValidate onSubmit={onSubmit}><label><span>ชื่อหมวดหมู่ <em className="admin-required-mark" aria-hidden="true">*</em></span><input name="name" defaultValue={defaultName} autoFocus maxLength={160} placeholder="กรอกชื่อหมวดหมู่" aria-invalid={Boolean(error)} aria-describedby={error ? "category-name-error" : undefined} onChange={onNameChange}/>{error ? <small id="category-name-error" className="category-field-error">{error}</small> : null}</label><footer><button type="button" disabled={pending} onClick={onClose}>ยกเลิก</button><button type="submit" className="primary-button" disabled={pending}>{pending ? <LoaderCircle className="profile-submit-spinner" size={16}/> : defaultName ? <Pencil size={15}/> : <Plus size={16}/>} {pending ? "กำลังบันทึก..." : submitLabel}</button></footer></form></div></div>;
}
