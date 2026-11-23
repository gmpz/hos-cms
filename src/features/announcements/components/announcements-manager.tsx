"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Eye,
  Image as ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Type,
} from "lucide-react";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { PendingDraftStatus, StatusBadge } from "@/components/ui/status-badge";
import type { AnnouncementDto } from "@/features/announcements/types";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import { AnnouncementPurgeDialog } from "./announcement-purge-dialog";




export function AnnouncementsManager() {
  const [items, setItems] = useState<AnnouncementDto[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ active: 0, published: 0, draft: 0, trash: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "trash">("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const requestInFlight = useRef(false);
  const [confirm, setConfirm] = useState<{
    item: AnnouncementDto;
    action: "publish" | "unpublish" | "delete" | "restore" | "purge";
  } | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleItems = items;
  function selectFilter(next: typeof filter) { setFilter(next); setCurrentPage(1); }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    const params = new URLSearchParams({ page: String(currentPage), size: String(pageSize), status: filter });
    void fetch(`/api/announcements/admin-list?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ"); return await response.json() as { items: AnnouncementDto[]; page: number; total: number; counts: typeof counts }; })
      .then((result) => { if (controller.signal.aborted) return; setItems(result.items); setTotal(result.total); setCounts(result.counts); setCurrentPage(result.page); })
      .catch(() => { if (!controller.signal.aborted) showGlobalToast({ title: "โหลดข้อมูลไม่สำเร็จ", description: "กรุณาลองใหม่อีกครั้ง", variant: "error" }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currentPage, pageSize, filter, refreshKey]);

  async function act() {
    if (!confirm || requestInFlight.current) return;
    requestInFlight.current = true;
    setPending(true);
    try {
      const response = await fetch(`/api/announcements/${confirm.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: confirm.action,
          revision: confirm.item.revision,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "ดำเนินการไม่สำเร็จ");
      const action = confirm.action;
      setConfirm(null);
      setRefreshKey((value) => value + 1);
      showGlobalToast({
        title: "ดำเนินการแล้ว",
        description:
          action === "publish"
            ? "เผยแพร่ประกาศแล้ว"
            : action === "unpublish"
              ? "ยกเลิกการเผยแพร่แล้ว"
              : action === "delete" ? "ย้ายประกาศไปถังขยะแล้ว" : action === "restore" ? "กู้คืนประกาศเป็นฉบับร่างแล้ว" : "ลบประกาศถาวรแล้ว",
      });
    } catch (error) {
      showGlobalToast({
        title: "ดำเนินการไม่สำเร็จ",
        description: error instanceof Error ? error.message : "กรุณาลองใหม่",
        variant: "error",
      });
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="announcements-manager documents-manager modal-announcements-manager">
      <header className="documents-heading">
        <div>
          <h1>ประกาศ</h1>
          <p>จัดการประกาศที่แสดงเมื่อผู้ชมเข้าหน้าสาธารณะครั้งแรก</p>
        </div>
        <Link className="primary-button" href="/admin/announcements/new">
          <Plus size={18} />
          เพิ่มประกาศ
        </Link>
      </header>
      <section className="announcement-summary document-summary" aria-label="สรุปประกาศ">
        <button type="button" aria-pressed={filter === "all"} onClick={() => selectFilter("all")}><span className="document-summary-icon"><Megaphone size={19}/></span><span className="document-summary-copy">ประกาศทั้งหมด<strong>{counts.active}</strong></span></button>
        <button type="button" aria-pressed={filter === "published"} onClick={() => selectFilter("published")}><span className="document-summary-icon"><Send size={19}/></span><span className="document-summary-copy">เผยแพร่แล้ว<strong>{counts.published}</strong></span></button>
        <button type="button" aria-pressed={filter === "draft"} onClick={() => selectFilter("draft")}><span className="document-summary-icon"><Archive size={19}/></span><span className="document-summary-copy">ฉบับร่าง<strong>{counts.draft}</strong></span></button>
        <button type="button" aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><span className="document-summary-icon"><Trash2 size={19}/></span><span className="document-summary-copy">อยู่ในถังขยะ<strong>{counts.trash}</strong></span></button>
      </section>
      <div className="news-list-switch" role="group" aria-label="เลือกรายการประกาศ"><button type="button" className={filter !== "trash" ? "active" : ""} aria-pressed={filter !== "trash"} onClick={() => selectFilter("all")}>รายการประกาศ</button><button type="button" className={filter === "trash" ? "active" : ""} aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><Trash2 size={15}/>ถังขยะ{counts.trash ? ` (${counts.trash})` : ""}</button></div>
      <section className="documents-table admin-data-table">
        <p className="announcements-table-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p>
        <div className="documents-table-scroll admin-data-table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>ประกาศ</th>
                <th>ประเภทเนื้อหา</th>
                <th>ลำดับ</th>
                <th>{filter === "trash" ? "ลบเมื่อ" : "แก้ไขล่าสุด"}</th>
                <th>สถานะ</th>
                <th className="admin-table-actions-heading">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoadingRows kind="announcements" />
              ) : total === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="documents-empty">
                      <Megaphone />
                      <strong>{filter === "trash" ? "ไม่มีประกาศในถังขยะ" : "ไม่พบประกาศ"}</strong>
                      <p>{filter === "trash" ? "รายการที่ลบจะปรากฏที่นี่เพื่อให้กู้คืนหรือลบถาวร" : "ลองเลือกสถานะอื่น หรือเพิ่มประกาศใหม่"}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="document-title-cell">
                        <span>
                          {(filter !== "trash" && item.status === "PUBLISHED" ? item.publishedModal?.contentMode ?? item.contentMode : item.contentMode) === "IMAGE" ? (
                            <ImageIcon size={18} />
                          ) : (
                            <Megaphone size={18} />
                          )}
                        </span>
                        <div>
                          <strong>{filter !== "trash" && item.status === "PUBLISHED" ? item.publishedModal?.title ?? item.title : item.title}</strong>
                          <small>
                            {filter !== "trash" && item.hasUnpublishedChanges ? `ร่าง: ${item.title}` : announcementPlainText(item.description) ||
                              item.imageAlt ||
                              "ประกาศรูปภาพ"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="announcement-content-type">
                        {(filter !== "trash" && item.status === "PUBLISHED" ? item.publishedModal?.contentMode ?? item.contentMode : item.contentMode) === "IMAGE"
                          ? <><ImageIcon size={16} />รูปภาพ</>
                          : <><Type size={16} />ข้อความ</>}
                      </span>
                    </td>
                    <td>
                      {filter !== "trash" && item.status === "PUBLISHED" ? item.publishedModal?.priority ?? item.priority : item.priority}
                    </td>
                    <td>
                      {new Date(filter === "trash" ? item.deletedAt ?? item.updatedAt : item.updatedAt).toLocaleDateString("th-TH")}
                    </td>
                    <td>
                      {filter === "trash" ? <span className="news-deleted-status">อยู่ในถังขยะ</span> : <><StatusBadge
                        status={
                          item.status === "PUBLISHED" ? "published" : item.status === "UNPUBLISHED" ? "unpublished" : "draft"
                        }
                      />
                        {item.hasUnpublishedChanges ? <PendingDraftStatus /> : null}</>}
                    </td>
                    <td>
                      <div className="announcement-row-actions admin-table-actions">
                        {filter === "trash" ? <><button type="button" disabled={pending} aria-label={`กู้คืน ${item.title}`} title="กู้คืน" onClick={() => setConfirm({ item, action: "restore" })}><RotateCcw size={17}/></button><button type="button" className="danger" disabled={pending} aria-label={`ลบ ${item.title} ถาวร`} title="ลบถาวร" onClick={() => setConfirm({ item, action: "purge" })}><Trash2 size={17}/></button></> : <>
                        <Link
                          aria-label="แก้ไข"
                          title="แก้ไขประกาศ"
                          href={`/admin/announcements/${item.id}/edit`}
                        >
                          <Pencil size={17} />
                        </Link>
                        <button
                          disabled={pending}
                          aria-label={
                            item.status === "PUBLISHED"
                              ? "ยกเลิกเผยแพร่"
                              : "เผยแพร่"
                          }
                          title={item.status === "PUBLISHED" ? "ยกเลิกเผยแพร่" : "เผยแพร่"}
                          onClick={() =>
                            setConfirm({
                              item,
                              action:
                                item.status === "PUBLISHED"
                                  ? "unpublish"
                                  : "publish",
                            })
                          }
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          className="danger"
                          disabled={pending}
                          aria-label="ลบ"
                          title="ย้ายไปถังขยะ"
                          onClick={() => setConfirm({ item, action: "delete" })}
                        >
                          <Trash2 size={17} />
                        </button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && total > 0 ? (
          <AdminTablePagination page={safePage} pageCount={totalPages} pageSize={pageSize} total={total} label="เปลี่ยนหน้ารายการประกาศ" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/>
        ) : null}
      </section>
      {confirm?.action === "purge" ? <AnnouncementPurgeDialog key={confirm.item.id} title="ลบประกาศถาวร?" description={`รายการ “${confirm.item.title}” จะกู้คืนไม่ได้ แต่รูปภาพยังอยู่ในคลังสื่อ`} pending={pending} onClose={() => { if (!requestInFlight.current) setConfirm(null); }} onConfirm={() => void act()}/> : confirm ? (
        <ConfirmDialog
          title={
            confirm.action === "delete"
              ? "ย้ายประกาศไปถังขยะ?"
              : confirm.action === "restore"
                ? "กู้คืนประกาศ?"
              : confirm.action === "publish"
                ? "เผยแพร่ประกาศ?"
                : "ยกเลิกการเผยแพร่?"
          }
          description={
            confirm.action === "delete" ? `รายการ “${confirm.item.title}” จะย้ายไปถังขยะและกู้คืนได้` : confirm.action === "restore" ? `รายการ “${confirm.item.title}” จะกลับเป็นฉบับร่าง` : `รายการ “${confirm.item.title}” จะถูก${confirm.action === "unpublish" ? "นำออกจากเว็บไซต์" : "แสดงบนเว็บไซต์"}`
          }
          confirmLabel={
            confirm.action === "delete"
              ? "ย้ายไปถังขยะ"
              : confirm.action === "restore"
                ? "กู้คืน"
              : confirm.action === "publish"
                ? "เผยแพร่"
                : "ยกเลิกเผยแพร่"
          }
          variant={confirm.action === "delete" ? "danger" : "default"}
          pending={pending}
          onClose={() => { if (!requestInFlight.current) setConfirm(null); }}
          onConfirm={() => void act()}
        />
      ) : null}
    </div>
  );
}
