"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, Eye, EyeOff, Image as ImageIcon, MonitorUp, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { PendingDraftStatus, StatusBadge } from "@/components/ui/status-badge";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import type { AnnouncementDto } from "@/features/announcements/types";
import { AnnouncementPurgeDialog } from "@/features/announcements/components/announcement-purge-dialog";




async function fetchSplashScreens(trash: boolean, signal?: AbortSignal): Promise<AnnouncementDto[]> {
  const response = await fetch(`/api/splash-screens${trash ? "?trash=1" : ""}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return await response.json() as AnnouncementDto[];
}

export function SplashScreensManager({ initialItems }: { initialItems: AnnouncementDto[] }) {
  const [items, setItems] = useState(initialItems);
  const [deletedItems, setDeletedItems] = useState<AnnouncementDto[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "trash">("all");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const requestInFlight = useRef(false);
  const listRequestId = useRef(0);
  const [confirm, setConfirm] = useState<{ item: AnnouncementDto; action: "publish" | "unpublish" | "delete" | "restore" | "purge" } | null>(null);
  const filteredItems = filter === "trash" ? deletedItems : filter === "published" ? items.filter((item) => item.status === "PUBLISHED") : filter === "draft" ? items.filter((item) => item.status === "DRAFT") : items;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleItems = filteredItems.slice(pageStart, pageStart + pageSize);
  function selectFilter(next: typeof filter) { setFilter(next); setCurrentPage(1); }


  const load = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    try {
      const [active, deleted] = await Promise.all([fetchSplashScreens(false), fetchSplashScreens(true)]);
      if (requestId === listRequestId.current) { setItems(active); setDeletedItems(deleted); }
    } catch { showGlobalToast({ title: "โหลดข้อมูลไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "error" }); }
    finally { if (requestId === listRequestId.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestId.current;
    void Promise.all([fetchSplashScreens(false, controller.signal), fetchSplashScreens(true, controller.signal)]).then(([active, deleted]) => {
      if (requestId === listRequestId.current) { setItems(active); setDeletedItems(deleted); }
    }).catch(() => {
      if (!controller.signal.aborted) showGlobalToast({ title: "โหลดข้อมูลไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    });
    return () => { controller.abort(); listRequestId.current += 1; };
  }, []);

  async function act() {
    if (!confirm || requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    try {
      const response = await fetch(`/api/splash-screens/${confirm.item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: confirm.action, revision: confirm.item.revision }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "ดำเนินการไม่สำเร็จ");
      const action = confirm.action;
      await load();
      setConfirm(null);
      showGlobalToast({ title: "ดำเนินการแล้ว", description: action === "publish" ? "เผยแพร่ Splash Screen แล้ว" : action === "unpublish" ? "ยกเลิกการเผยแพร่แล้ว" : action === "delete" ? "ย้าย Splash Screen ไปถังขยะแล้ว" : action === "restore" ? "กู้คืน Splash Screen เป็นฉบับร่างแล้ว" : "ลบ Splash Screen ถาวรแล้ว" });
    } catch (error) { showGlobalToast({ title: "ดำเนินการไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" }); }
    finally { requestInFlight.current = false; setPending(false); }
  }

  return <div className="announcements-manager documents-manager splash-screens-manager">
    <header className="documents-heading"><div><h1>หน้าต้อนรับ</h1><p>จัดการหน้าต้อนรับก่อนเข้าสู่เว็บไซต์ โดยเผยแพร่ได้ครั้งละหนึ่งรายการ</p></div><Link className="primary-button" href="/admin/splash-screens/new"><Plus size={18}/>เพิ่มหน้าต้อนรับ</Link></header>
    <section className="announcement-summary document-summary" aria-label="สรุป Splash Screen">
      <button type="button" aria-pressed={filter === "all"} onClick={() => selectFilter("all")}><span className="document-summary-icon"><MonitorUp size={19}/></span><span className="document-summary-copy">ทั้งหมด<strong>{items.length}</strong></span></button>
      <button type="button" aria-pressed={filter === "published"} onClick={() => selectFilter("published")}><span className="document-summary-icon"><Send size={19}/></span><span className="document-summary-copy">เผยแพร่แล้ว<strong>{items.filter((item) => item.status === "PUBLISHED").length}</strong></span></button>
      <button type="button" aria-pressed={filter === "draft"} onClick={() => selectFilter("draft")}><span className="document-summary-icon"><Archive size={19}/></span><span className="document-summary-copy">ฉบับร่าง<strong>{items.filter((item) => item.status === "DRAFT").length}</strong></span></button>
      <button type="button" aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><span className="document-summary-icon"><Trash2 size={19}/></span><span className="document-summary-copy">อยู่ในถังขยะ<strong>{deletedItems.length}</strong></span></button>
    </section>
    <div className="news-list-switch" role="group" aria-label="เลือกรายการหน้าต้อนรับ"><button type="button" className={filter !== "trash" ? "active" : ""} aria-pressed={filter !== "trash"} onClick={() => selectFilter("all")}>รายการหน้าต้อนรับ</button><button type="button" className={filter === "trash" ? "active" : ""} aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><Trash2 size={15}/>ถังขยะ{deletedItems.length ? ` (${deletedItems.length})` : ""}</button></div>
    <section className="documents-table admin-data-table"><p className="splash-table-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p><div className="documents-table-scroll admin-data-table-scroll" tabIndex={0}><table><thead><tr><th>Splash Screen</th><th>ประเภทเนื้อหา</th><th>{filter === "trash" ? "ลบเมื่อ" : "แก้ไขล่าสุด"}</th><th>สถานะ</th><th className="admin-table-actions-heading">จัดการ</th></tr></thead><tbody>
      {loading ? <AdminTableLoadingRows columns={5}/> : filteredItems.length === 0 ? <tr><td colSpan={5}><div className="documents-empty"><MonitorUp/><strong>{filter === "trash" ? "ไม่มี Splash Screen ในถังขยะ" : "ไม่พบ Splash Screen"}</strong><p>{filter === "trash" ? "รายการที่ลบจะปรากฏที่นี่เพื่อให้กู้คืนหรือลบถาวร" : "ลองเลือกสถานะอื่น หรือสร้าง Splash Screen ใหม่"}</p></div></td></tr> : visibleItems.map((item) => <tr key={item.id}>
        <td><div className="document-title-cell admin-table-primary"><span>{item.contentMode === "IMAGE" ? <ImageIcon size={18}/> : <MonitorUp size={18}/>}</span><div><strong>{item.title}</strong><small>{item.contentMode === "IMAGE" ? item.imageAlt || "Splash Screen รูปภาพ" : announcementPlainText(item.description)}</small></div></div></td>
        <td>{item.contentMode === "IMAGE" ? "รูปภาพ" : "ข้อความ"}</td><td>{new Date(filter === "trash" ? item.deletedAt ?? item.updatedAt : item.updatedAt).toLocaleDateString("th-TH")}</td>
        <td>{filter === "trash" ? <span className="news-deleted-status">อยู่ในถังขยะ</span> : <><StatusBadge status={item.status === "PUBLISHED" ? "published" : item.status === "UNPUBLISHED" ? "unpublished" : "draft"}/>{item.hasUnpublishedChanges ? <PendingDraftStatus /> : null}</>}</td>
        <td><div className="announcement-row-actions admin-table-actions">{filter === "trash" ? <><button type="button" disabled={pending} aria-label={`กู้คืน ${item.title}`} title="กู้คืน" onClick={() => setConfirm({ item, action: "restore" })}><RotateCcw size={17}/></button><button type="button" className="danger" disabled={pending} aria-label={`ลบ ${item.title} ถาวร`} title="ลบถาวร" onClick={() => setConfirm({ item, action: "purge" })}><Trash2 size={17}/></button></> : <><Link aria-label="แก้ไข" title="แก้ไขหน้าต้อนรับ" href={`/admin/splash-screens/${item.id}/edit`}><Pencil size={17}/></Link><button type="button" disabled={pending} aria-label={item.status === "PUBLISHED" ? "ยกเลิกเผยแพร่" : "เผยแพร่"} title={item.status === "PUBLISHED" ? "ยกเลิกเผยแพร่" : "เผยแพร่"} onClick={() => setConfirm({ item, action: item.status === "PUBLISHED" ? "unpublish" : "publish" })}>{item.status === "PUBLISHED" ? <EyeOff size={17}/> : <Eye size={17}/>}</button><button type="button" className="danger" disabled={pending} aria-label="ลบ" title="ย้ายไปถังขยะ" onClick={() => setConfirm({ item, action: "delete" })}><Trash2 size={17}/></button></>}</div></td>
      </tr>)}</tbody></table></div>
      {!loading && filteredItems.length > 0 ? <AdminTablePagination page={safePage} pageCount={totalPages} pageSize={pageSize} total={filteredItems.length} label="เปลี่ยนหน้ารายการหน้าต้อนรับ" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/> : null}
    </section>
    {confirm?.action === "purge" ? <AnnouncementPurgeDialog key={confirm.item.id} title="ลบ Splash Screen ถาวร?" description={`รายการ “${confirm.item.title}” จะกู้คืนไม่ได้ แต่รูปภาพยังอยู่ในคลังสื่อ`} pending={pending} onClose={() => { if (!requestInFlight.current) setConfirm(null); }} onConfirm={() => void act()}/> : confirm ? <ConfirmDialog title={confirm.action === "delete" ? "ย้าย Splash Screen ไปถังขยะ?" : confirm.action === "restore" ? "กู้คืน Splash Screen?" : confirm.action === "publish" ? "เผยแพร่ Splash Screen?" : "ยกเลิกการเผยแพร่?"} description={confirm.action === "publish" ? "Splash Screen ที่เผยแพร่อยู่จะถูกยกเลิกเผยแพร่โดยอัตโนมัติ" : confirm.action === "delete" ? `รายการ “${confirm.item.title}” จะย้ายไปถังขยะและกู้คืนได้` : confirm.action === "restore" ? `รายการ “${confirm.item.title}” จะกลับเป็นฉบับร่าง` : `รายการ “${confirm.item.title}” จะถูกนำออกจากเว็บไซต์`} confirmLabel={confirm.action === "delete" ? "ย้ายไปถังขยะ" : confirm.action === "restore" ? "กู้คืน" : confirm.action === "publish" ? "เผยแพร่" : "ยกเลิกเผยแพร่"} variant={confirm.action === "delete" ? "danger" : "default"} pending={pending} onClose={() => { if (!requestInFlight.current) setConfirm(null); }} onConfirm={() => void act()}/> : null}
  </div>;
}
