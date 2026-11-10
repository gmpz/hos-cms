"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Image as ImageIcon, MonitorUp, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import type { AnnouncementDto } from "@/features/announcements/types";

const pageSize = 10;

function paginationItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
}

async function fetchSplashScreens(signal?: AbortSignal): Promise<AnnouncementDto[]> {
  const response = await fetch("/api/splash-screens", { cache: "no-store", signal });
  if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return await response.json() as AnnouncementDto[];
}

export function SplashScreensManager({ initialItems }: { initialItems: AnnouncementDto[] }) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const requestInFlight = useRef(false);
  const listRequestId = useRef(0);
  const [confirm, setConfirm] = useState<{ item: AnnouncementDto; action: "publish" | "unpublish" | "delete" } | null>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleItems = items.slice(pageStart, pageStart + pageSize);
  const pageNumbers = paginationItems(safePage, totalPages);

  const load = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    try {
      const latestItems = await fetchSplashScreens();
      if (requestId === listRequestId.current) setItems(latestItems);
    } catch { showGlobalToast({ title: "โหลดข้อมูลไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "error" }); }
    finally { if (requestId === listRequestId.current) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestId.current;
    void fetchSplashScreens(controller.signal).then((latestItems) => {
      if (requestId === listRequestId.current) setItems(latestItems);
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
      showGlobalToast({ title: "ดำเนินการแล้ว", description: action === "publish" ? "เผยแพร่ Splash Screen แล้ว" : action === "unpublish" ? "ยกเลิกการเผยแพร่แล้ว" : "ลบ Splash Screen แล้ว" });
    } catch (error) { showGlobalToast({ title: "ดำเนินการไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" }); }
    finally { requestInFlight.current = false; setPending(false); }
  }

  return <div className="announcements-manager documents-manager splash-screens-manager">
    <header className="documents-heading"><div><h1>Splash Screens</h1><p>จัดการหน้าต้อนรับก่อนเข้าสู่เว็บไซต์ โดยเผยแพร่ได้ครั้งละหนึ่งรายการ</p></div><Link className="primary-button" href="/admin/splash-screens/new"><Plus size={18}/>เพิ่ม Splash Screen</Link></header>
    <section className="announcement-summary document-summary">
      <div><span><MonitorUp size={19}/></span><p>ทั้งหมด<strong>{items.length}</strong></p></div>
      <div><span><Send size={19}/></span><p>เผยแพร่แล้ว<strong>{items.filter((item) => item.status === "PUBLISHED").length}</strong></p></div>
      <div><span><MonitorUp size={19}/></span><p>ฉบับร่าง<strong>{items.filter((item) => item.status === "DRAFT").length}</strong></p></div>
    </section>
    <section className="documents-table"><p className="splash-table-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p><div className="documents-table-scroll" tabIndex={0}><table><thead><tr><th>Splash Screen</th><th>ประเภทเนื้อหา</th><th>แก้ไขล่าสุด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>
      {loading ? <AdminTableLoadingRows columns={5}/> : items.length === 0 ? <tr><td colSpan={5}><div className="documents-empty"><MonitorUp/><strong>ยังไม่มี Splash Screen</strong><p>สร้างหน้าต้อนรับสำหรับผู้เข้าชมเว็บไซต์ได้ที่นี่</p></div></td></tr> : visibleItems.map((item) => <tr key={item.id}>
        <td><div className="document-title-cell"><span>{item.contentMode === "IMAGE" ? <ImageIcon size={18}/> : <MonitorUp size={18}/>}</span><div><strong>{item.title}</strong><small>{item.contentMode === "IMAGE" ? item.imageAlt || "Splash Screen รูปภาพ" : announcementPlainText(item.description)}</small></div></div></td>
        <td>{item.contentMode === "IMAGE" ? "รูปภาพ" : "ข้อความ"}</td><td>{new Date(item.updatedAt).toLocaleDateString("th-TH")}</td>
        <td><StatusBadge status={item.status === "PUBLISHED" ? "published" : item.status === "UNPUBLISHED" ? "unpublished" : "draft"}/>{item.hasUnpublishedChanges ? <small className="splash-draft-list-label">มีร่างที่ยังไม่เผยแพร่</small> : null}</td>
        <td><div className="announcement-row-actions"><Link aria-label="แก้ไข" href={`/admin/splash-screens/${item.id}/edit`}><Pencil size={17}/></Link><button disabled={pending} aria-label={item.status === "PUBLISHED" ? "ยกเลิกเผยแพร่" : "เผยแพร่"} onClick={() => setConfirm({ item, action: item.status === "PUBLISHED" ? "unpublish" : "publish" })}><Eye size={17}/></button><button className="danger" disabled={pending} aria-label="ลบ" onClick={() => setConfirm({ item, action: "delete" })}><Trash2 size={17}/></button></div></td>
      </tr>)}</tbody></table></div></section>
    {items.length > pageSize ? <div className="pages-pagination splash-pagination"><p>แสดง {pageStart + 1}–{Math.min(pageStart + pageSize, items.length)} จาก {items.length} รายการ</p><nav aria-label="เปลี่ยนหน้ารายการ Splash Screens"><button type="button" disabled={safePage === 1 || loading} onClick={() => setCurrentPage(safePage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></button>{pageNumbers.map((page, index) => <span className="splash-pagination-page" key={page}>{index > 0 && page - pageNumbers[index - 1] > 1 ? <i aria-hidden="true">…</i> : null}<button type="button" className={page === safePage ? "active" : ""} aria-current={page === safePage ? "page" : undefined} disabled={loading} onClick={() => setCurrentPage(page)}>{page}</button></span>)}<span className="splash-pagination-current" aria-live="polite">หน้า {safePage} จาก {totalPages}</span><button type="button" disabled={safePage === totalPages || loading} onClick={() => setCurrentPage(safePage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></button></nav></div> : null}
    {confirm ? <ConfirmDialog title={confirm.action === "delete" ? "ลบ Splash Screen?" : confirm.action === "publish" ? "เผยแพร่ Splash Screen?" : "ยกเลิกการเผยแพร่?"} description={confirm.action === "publish" ? "Splash Screen ที่เผยแพร่อยู่จะถูกยกเลิกเผยแพร่โดยอัตโนมัติ" : `รายการ “${confirm.item.title}” จะถูก${confirm.action === "delete" ? "ลบ" : "นำออกจากเว็บไซต์"}`} confirmLabel={confirm.action === "delete" ? "ลบ" : confirm.action === "publish" ? "เผยแพร่" : "ยกเลิกเผยแพร่"} pendingLabel={confirm.action === "delete" ? "กำลังลบ..." : confirm.action === "publish" ? "กำลังเผยแพร่..." : "กำลังยกเลิกเผยแพร่..."} variant={confirm.action === "publish" ? "default" : "danger"} pending={pending} onClose={() => { if (!requestInFlight.current) setConfirm(null); }} onConfirm={() => void act()}/> : null}
  </div>;
}
