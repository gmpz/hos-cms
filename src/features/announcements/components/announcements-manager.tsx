"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { PendingDraftStatus, StatusBadge } from "@/components/ui/status-badge";
import type { AnnouncementDto } from "@/features/announcements/types";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import { AnnouncementPurgeDialog } from "./announcement-purge-dialog";




async function fetchAnnouncements(trash: boolean, signal?: AbortSignal): Promise<AnnouncementDto[]> {
  const response = await fetch(`/api/announcements${trash ? "?trash=1" : ""}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return await response.json() as AnnouncementDto[];
}

export function AnnouncementsManager({
  initialItems,
}: {
  initialItems: AnnouncementDto[];
}) {
  const [items, setItems] = useState<AnnouncementDto[]>(initialItems);
  const [deletedItems, setDeletedItems] = useState<AnnouncementDto[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "trash">("all");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const requestInFlight = useRef(false);
  const listRequestId = useRef(0);
  const [confirm, setConfirm] = useState<{
    item: AnnouncementDto;
    action: "publish" | "unpublish" | "delete" | "restore" | "purge";
  } | null>(null);
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
      const [active, deleted] = await Promise.all([fetchAnnouncements(false), fetchAnnouncements(true)]);
      if (requestId === listRequestId.current) { setItems(active); setDeletedItems(deleted); }
    } catch {
      showGlobalToast({
        title: "โหลดข้อมูลไม่สำเร็จ",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++listRequestId.current;
    void Promise.all([fetchAnnouncements(false, controller.signal), fetchAnnouncements(true, controller.signal)]).then(([active, deleted]) => {
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
      await load();
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
        <button type="button" aria-pressed={filter === "all"} onClick={() => selectFilter("all")}><span className="document-summary-icon"><Megaphone size={19}/></span><span className="document-summary-copy">ประกาศทั้งหมด<strong>{items.length}</strong></span></button>
        <button type="button" aria-pressed={filter === "published"} onClick={() => selectFilter("published")}><span className="document-summary-icon"><Send size={19}/></span><span className="document-summary-copy">เผยแพร่แล้ว<strong>{items.filter((item) => item.status === "PUBLISHED").length}</strong></span></button>
        <button type="button" aria-pressed={filter === "draft"} onClick={() => selectFilter("draft")}><span className="document-summary-icon"><Archive size={19}/></span><span className="document-summary-copy">ฉบับร่าง<strong>{items.filter((item) => item.status === "DRAFT").length}</strong></span></button>
        <button type="button" aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><span className="document-summary-icon"><Trash2 size={19}/></span><span className="document-summary-copy">อยู่ในถังขยะ<strong>{deletedItems.length}</strong></span></button>
      </section>
      <div className="news-list-switch" role="group" aria-label="เลือกรายการประกาศ"><button type="button" className={filter !== "trash" ? "active" : ""} aria-pressed={filter !== "trash"} onClick={() => selectFilter("all")}>รายการประกาศ</button><button type="button" className={filter === "trash" ? "active" : ""} aria-pressed={filter === "trash"} onClick={() => selectFilter("trash")}><Trash2 size={15}/>ถังขยะ{deletedItems.length ? ` (${deletedItems.length})` : ""}</button></div>
      <section className="documents-table admin-data-table">
        <p className="announcements-table-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p>
        <div className="documents-table-scroll admin-data-table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>ประกาศ</th>
                <th>ลำดับ</th>
                <th>{filter === "trash" ? "ลบเมื่อ" : "แก้ไขล่าสุด"}</th>
                <th>สถานะ</th>
                <th className="admin-table-actions-heading">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableLoadingRows columns={5} />
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5}>
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
        {!loading && filteredItems.length > 0 ? (
          <AdminTablePagination page={safePage} pageCount={totalPages} pageSize={pageSize} total={filteredItems.length} label="เปลี่ยนหน้ารายการประกาศ" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/>
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
