"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  Building2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PendingDraftStatus, StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { showGlobalToast } from "@/components/ui/global-toast";
import type { DemoUnit } from "../demo/model";
import { unitCoverStyle } from "./unit-cover-style";

const subscribeToHydration = () => () => undefined;
const deletedDateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
const confirmationCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newConfirmationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => confirmationCharacters[byte % confirmationCharacters.length]).join("");
}



function UnitActionsMenu({
  unit,
  disabled,
  onAction,
}: {
  unit: DemoUnit;
  disabled: boolean;
  onAction: (action: "unpublish" | "delete") => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnPointer = (event: PointerEvent) => {
      if (
        menuRef.current?.contains(event.target as Node) ||
        triggerRef.current?.contains(event.target as Node)
      )
        return;
      setPosition(null);
    };
    const closeOnResize = () => setPosition(null);
    const stopDismissal = listenForDropdownDismissal(
      () => menuRef.current,
      (target) => target instanceof Node && Boolean(triggerRef.current?.contains(target) || menuRef.current?.contains(target)),
      () => setPosition(null),
    );
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPosition(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnKey);

    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnKey);
      stopDismissal();
      window.removeEventListener("resize", closeOnResize);
    };
  }, [position]);

  function toggleMenu() {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 195;
    const menuHeight = (unit.status === "published" ? 2 : 1) * 40 + 12;
    setPosition({
      left: Math.max(
        8,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8),
      ),
      top:
        rect.bottom + menuHeight + 8 > window.innerHeight
          ? Math.max(8, rect.top - menuHeight - 6)
          : rect.bottom + 6,
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={`ตัวเลือกเพิ่มเติม ${unit.name}`}
        title="ตัวเลือกเพิ่มเติม"
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={18} />
      </button>
      {position
        ? createPortal(
            <div
              ref={menuRef}
              className="unit-actions-menu"
              role="menu"
              aria-label={`จัดการ ${unit.name}`}
              style={position}
            >
              {unit.status === "published" ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPosition(null);
                    onAction("unpublish");
                  }}
                >
                  <EyeOff size={16} />
                  ยกเลิกเผยแพร่
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setPosition(null);
                  onAction("delete");
                }}
              >
                <Trash2 size={16} />
                ลบกลุ่มงาน
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function UnitsManager() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [counts, setCounts] = useState({ active: 0, published: 0, draft: 0, trash: 0 });
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "trash">("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<DemoUnit | null>(null);
  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<DemoUnit | null>(
    null,
  );
  const [pendingRestoreUnit, setPendingRestoreUnit] = useState<DemoUnit | null>(null);
  const [pendingPurgeUnit, setPendingPurgeUnit] = useState<DemoUnit | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  async function moveUnit(unit: DemoUnit, direction: "up" | "down") {
    if (reordering || search.trim() || statusFilter !== "all") return;
    setReordering(true);
    try {
      const response = await fetch("/api/units/admin-reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: unit.id, direction }) });
      if (!response.ok) throw new Error("จัดลำดับหน่วยงานไม่สำเร็จ");
      setRefreshKey((value) => value + 1);
      showGlobalToast({ title: "จัดลำดับแล้ว", description: `เลื่อน “${unit.name}”${direction === "up" ? "ขึ้น" : "ลง"}เรียบร้อย`, variant: "success" });
    } catch (error) {
      showGlobalToast({ title: "จัดลำดับไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally { setReordering(false); }
  }
  async function handleUnpublish(unit: DemoUnit) {
    if (workingId) return;
    setWorkingId(unit.id);
    try {
      const response = await fetch(`/api/units/${unit.id}/unpublish`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "ยกเลิกการเผยแพร่ไม่สำเร็จ");
      }
      setRefreshKey((value) => value + 1);
      showGlobalToast({
        title: "ยกเลิกการเผยแพร่แล้ว",
        description: `“${unit.name}” ไม่แสดงบนเว็บไซต์แล้ว`,
        variant: "success",
      });
      setPendingUnit(null);
    } catch (error) {
      showGlobalToast({
        title: "ยกเลิกการเผยแพร่ไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setWorkingId(null);
    }
  }
  async function handleDelete(unit: DemoUnit) {
    if (workingId) return;
    setWorkingId(unit.id);
    try {
      const response = await fetch(`/api/units/${unit.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ลบกลุ่มงานไม่สำเร็จ");
      setRefreshKey((value) => value + 1);
      showGlobalToast({
        title: "ย้ายกลุ่มงานไปถังขยะแล้ว",
        description: `“${unit.name}” สามารถกู้คืนได้จากถังขยะ`,
        variant: "success",
      });
      setPendingDeleteUnit(null);
    } catch (error) {
      showGlobalToast({
        title: "ลบกลุ่มงานไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setWorkingId(null);
    }
  }
  async function handleRestore(unit: DemoUnit) {
    if (workingId) return;
    setWorkingId(unit.id);
    try {
      const response = await fetch(`/api/units/${unit.id}/restore`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "กู้คืนกลุ่มงานไม่สำเร็จ");
      setRefreshKey((value) => value + 1);
      setPendingRestoreUnit(null);
      showGlobalToast({ title: "กู้คืนกลุ่มงานแล้ว", description: `“${unit.name}” กลับมาเป็นฉบับร่าง`, variant: "success" });
    } catch (error) {
      showGlobalToast({ title: "กู้คืนกลุ่มงานไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setWorkingId(null);
    }
  }
  async function handlePurge(unit: DemoUnit) {
    if (workingId || confirmationText.trim() !== confirmationCode) return;
    setWorkingId(unit.id);
    try {
      const response = await fetch(`/api/units/${unit.id}/purge`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "ลบกลุ่มงานถาวรไม่สำเร็จ");
      setRefreshKey((value) => value + 1);
      setPendingPurgeUnit(null);
      showGlobalToast({ title: "ลบกลุ่มงานถาวรแล้ว", description: `“${unit.name}” ถูกลบออกจากระบบและกู้คืนไม่ได้`, variant: "success" });
    } catch (error) {
      showGlobalToast({ title: "ลบกลุ่มงานถาวรไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setWorkingId(null);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    const params = new URLSearchParams({ page: String(currentPage), size: String(pageSize), search: debouncedSearch, status: statusFilter });
    void fetch(`/api/units/admin-list?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("โหลดรายการหน่วยงานไม่สำเร็จ"); return await response.json() as { items: DemoUnit[]; page: number; total: number; counts: typeof counts }; })
      .then((result) => { if (controller.signal.aborted) return; setUnits(result.items); setCounts(result.counts); setTotal(result.total); setCurrentPage(result.page); setLoadError(false); })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currentPage, pageSize, debouncedSearch, statusFilter, refreshKey]);
  const tableLoading = !hydrated || loading;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleUnits = units;

  return (
    <div className="units-manager">
      <header className="units-heading">
        <div>
          <h1>หน่วยงานและกลุ่มงาน</h1>
          <p>จัดการข้อมูล บริการ และหน้าเว็บไซต์ของแต่ละกลุ่มงาน</p>
        </div>
        <Link href="/admin/units/new" className="primary-button">
          <Plus size={16} />
          สร้างกลุ่มงาน
        </Link>
      </header>
      <section className="unit-summary document-summary" aria-label="กรองกลุ่มงานตามสถานะ">
        <button type="button" aria-pressed={statusFilter === "all"} onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>
          <span className="document-summary-icon"><Building2 size={19} /></span>
          <span className="document-summary-copy">กลุ่มงานทั้งหมด<strong>{tableLoading ? "—" : counts.active}</strong></span>
        </button>
        <button type="button" aria-pressed={statusFilter === "published"} onClick={() => { setStatusFilter("published"); setCurrentPage(1); }}>
          <span className="document-summary-icon"><FileText size={19} /></span>
          <span className="document-summary-copy">เผยแพร่แล้ว<strong>{tableLoading ? "—" : counts.published}</strong></span>
        </button>
        <button type="button" aria-pressed={statusFilter === "draft"} onClick={() => { setStatusFilter("draft"); setCurrentPage(1); }}>
          <span className="document-summary-icon"><Archive size={19} /></span>
          <span className="document-summary-copy">ฉบับร่าง<strong>{tableLoading ? "—" : counts.draft}</strong></span>
        </button>
        <button type="button" aria-pressed={statusFilter === "trash"} onClick={() => { setStatusFilter("trash"); setCurrentPage(1); }}>
          <span className="document-summary-icon"><Trash2 size={19} /></span>
          <span className="document-summary-copy">อยู่ในถังขยะ<strong>{tableLoading ? "—" : counts.trash}</strong></span>
        </button>
      </section>
      <div className="units-toolbar">
        <label>
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหากลุ่มงาน..."
          />
        </label>
      </div>
      <div className="news-list-switch" role="group" aria-label="เลือกรายการหน่วยงาน">
        <button type="button" className={statusFilter !== "trash" ? "active" : ""} aria-pressed={statusFilter !== "trash"} onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>รายการหน่วยงาน</button>
        <button type="button" className={statusFilter === "trash" ? "active" : ""} aria-pressed={statusFilter === "trash"} onClick={() => { setStatusFilter("trash"); setCurrentPage(1); }}><Trash2 size={15} />ถังขยะ{counts.trash ? ` (${counts.trash})` : ""}</button>
      </div>
      <section className="units-table admin-data-table" aria-busy={tableLoading}>
        <div
          className="admin-list-table-scroll admin-data-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="ตารางหน่วยงาน เลื่อนซ้ายขวาได้"
        >
          <table>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>หน่วยงาน</th>
                <th>URL</th>
                <th>สถานะ</th>
                <th>{statusFilter === "trash" ? "ลบเมื่อ" : "อัปเดตล่าสุด"}</th>
                <th className="units-actions-heading admin-table-actions-heading" scope="col">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <AdminTableLoadingRows kind="units" />
              ) : loadError ? (
                <tr>
                  <td colSpan={6}>
                    <div className="units-empty" role="alert">
                      <AlertCircle size={28} />
                      <strong>โหลดรายการหน่วยงานไม่สำเร็จ</strong>
                      <p>กรุณาลองโหลดหน้านี้ใหม่อีกครั้ง</p>
                    </div>
                  </td>
                </tr>
              ) : total === 0 ? (
                <tr><td colSpan={6}><div className="units-empty"><Search size={28} /><strong>{statusFilter === "trash" && !search.trim() ? "ถังขยะว่าง" : "ไม่พบกลุ่มงาน"}</strong><p>{search.trim() ? "ลองเปลี่ยนคำค้นหา" : statusFilter === "trash" ? "กลุ่มงานที่ลบจะปรากฏที่นี่" : "ลองเลือกสถานะอื่น หรือสร้างกลุ่มงานใหม่"}</p></div></td></tr>
              ) : (
                visibleUnits.map((unit, visibleIndex) => {
                  const orderIndex = pageStart + visibleIndex;
                  const searching = Boolean(search.trim());
                  return (
                    <tr key={unit.id}>
                      <td>
                        <div className="category-arrow-order unit-arrow-order">
                          <span>{statusFilter === "trash" ? pageStart + visibleIndex + 1 : orderIndex + 1}</span>
                          {statusFilter !== "trash" ? <div>
                            <button
                              type="button"
                              disabled={
                                reordering || searching || statusFilter !== "all" || orderIndex === 0
                              }
                              title={
                                searching
                                  ? "ล้างคำค้นหาก่อนจัดลำดับ"
                                  : "เลื่อนขึ้น"
                              }
                              aria-label={`เลื่อน ${unit.name} ขึ้น`}
                              onClick={() => void moveUnit(unit, "up")}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={
                                reordering ||
                                searching ||
                                statusFilter !== "all" ||
                                orderIndex === counts.active - 1
                              }
                              title={
                                searching
                                  ? "ล้างคำค้นหาก่อนจัดลำดับ"
                                  : "เลื่อนลง"
                              }
                              aria-label={`เลื่อน ${unit.name} ลง`}
                              onClick={() => void moveUnit(unit, "down")}
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div> : null}
                        </div>
                      </td>
                      <td>
                        <div className="unit-name admin-table-primary">
                          <span className="unit-table-cover">
                            {unit.coverImageUrl ? (
                              <span
                                className="unit-cover-image-layer"
                                style={unitCoverStyle(
                                  { backgroundImage: `url(${unit.coverImageUrl})` },
                                  unit.coverFocus ?? { x: 50, y: 50 },
                                )}
                                aria-hidden="true"
                              />
                            ) : <Building2 size={18} />}
                          </span>
                          <div>
                            <strong>{unit.name}</strong>
                            {/* <small>{unit.summary || "ยังไม่มีคำอธิบาย"}</small> */}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>/units/{unit.slug}</code>
                      </td>
                      <td>
                        {statusFilter === "trash" ? <span className="unit-trash-status">อยู่ในถังขยะ</span> : <StatusBadge status={unit.status} />}
                        {statusFilter !== "trash" && unit.hasUnpublishedChanges ? <PendingDraftStatus /> : null}
                      </td>
                      <td>
                        <small>{statusFilter === "trash" && unit.deletedAt ? deletedDateFormat.format(new Date(unit.deletedAt)) : unit.updatedAt}</small>
                      </td>
                      <td>
                        <div className="unit-actions admin-table-actions">
                          {statusFilter === "trash" ? (
                            <>
                              <button type="button" disabled={workingId === unit.id} aria-label={`กู้คืน ${unit.name}`} title="กู้คืน" onClick={() => setPendingRestoreUnit(unit)}><RotateCcw size={17} /></button>
                              <button type="button" className="danger" disabled={workingId === unit.id} aria-label={`ลบ ${unit.name} ถาวร`} title="ลบถาวร" onClick={() => { setConfirmationText(""); setConfirmationCode(newConfirmationCode()); setPendingPurgeUnit(unit); }}><Trash2 size={17} /></button>
                            </>
                          ) : <>
                          <Link
                            href={`/admin/units/${unit.id}/edit`}
                            aria-label={`แก้ไข ${unit.name}`}
                            title="แก้ไขหน่วยงาน"
                          >
                            <Pencil size={17} />
                          </Link>
                          {unit.status === "published" && unit.publishedSlug ? (
                            <Link
                              href={`/units/${unit.publishedSlug}`}
                              target="_blank"
                              aria-label={`ดู ${unit.name}`}
                              title="ดูหน่วยงานบนเว็บไซต์"
                            >
                              <Eye size={17} />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="เผยแพร่กลุ่มงานก่อนจึงจะดูหน้าเว็บไซต์ได้"
                              aria-label={`ยังดู ${unit.name} ไม่ได้ เพราะเป็นฉบับร่าง`}
                            >
                              <Eye size={17} />
                            </button>
                          )}
                          <UnitActionsMenu
                            unit={unit}
                            disabled={workingId === unit.id}
                            onAction={(action) => {
                              if (action === "unpublish") setPendingUnit(unit);
                              else setPendingDeleteUnit(unit);
                            }}
                          />
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!tableLoading && !loadError && total > 0 ? (
          <AdminTablePagination className="units-pagination" page={safePage} pageCount={totalPages} pageSize={pageSize} total={total} label="เปลี่ยนหน้ารายการหน่วยงาน" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/>
        ) : null}
      </section>
      {pendingUnit ? (
        <ConfirmDialog
          title="ยกเลิกการเผยแพร่หน่วยงาน?"
          description={`หน้า “${pendingUnit.name}” จะไม่แสดงบนเว็บไซต์ ข้อมูลร่างยังอยู่และเผยแพร่ใหม่ได้`}
          confirmLabel="ยกเลิกการเผยแพร่"
          pending={workingId === pendingUnit.id}
          onClose={() => {
            if (!workingId) setPendingUnit(null);
          }}
          onConfirm={() => {
            void handleUnpublish(pendingUnit);
          }}
        />
      ) : null}
      {pendingDeleteUnit ? (
        <ConfirmDialog
          variant="danger"
          title={`ลบกลุ่มงาน “${pendingDeleteUnit.name}”?`}
          description="กลุ่มงานจะถูกย้ายไปถังขยะและสามารถกู้คืนได้ หากยังมีข่าว เอกสาร หรือถูกใช้กำหนดสิทธิ์ ระบบจะไม่อนุญาตให้ลบ"
          confirmLabel="ย้ายไปถังขยะ"
          pending={workingId === pendingDeleteUnit.id}
          onClose={() => {
            if (!workingId) setPendingDeleteUnit(null);
          }}
          onConfirm={() => {
            void handleDelete(pendingDeleteUnit);
          }}
        />
      ) : null}
      {pendingRestoreUnit ? (
        <ConfirmDialog
          variant="default"
          title={`กู้คืนกลุ่มงาน “${pendingRestoreUnit.name}”?`}
          description="กลุ่มงานจะกลับมาเป็นฉบับร่าง และยังไม่แสดงบนเว็บไซต์"
          confirmLabel="กู้คืนกลุ่มงาน"
          pending={workingId === pendingRestoreUnit.id}
          onClose={() => { if (!workingId) setPendingRestoreUnit(null); }}
          onConfirm={() => { void handleRestore(pendingRestoreUnit); }}
        />
      ) : null}
      {pendingPurgeUnit ? (
        <div className="modal-layer" onKeyDown={(event) => { if (event.key === "Escape" && !workingId) setPendingPurgeUnit(null); }}>
          <button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่างยืนยัน" onClick={() => { if (!workingId) setPendingPurgeUnit(null); }} />
          <div className="cms-confirm-dialog news-purge-dialog" role="alertdialog" aria-modal="true" aria-labelledby="unit-purge-title" aria-describedby="unit-purge-description">
            <div className="cms-confirm-dialog-icon" aria-hidden="true"><Trash2 size={30} /></div>
            <h2 id="unit-purge-title">ลบกลุ่มงานถาวร?</h2>
            <p id="unit-purge-description">กลุ่มงาน “{pendingPurgeUnit.name}” จะถูกลบออกจากระบบและกู้คืนไม่ได้</p>
            <label htmlFor="unit-purge-confirm">พิมพ์รหัส <strong className="news-purge-code">{confirmationCode}</strong> เพื่อยืนยัน</label>
            <input id="unit-purge-confirm" autoFocus value={confirmationText} onChange={(event) => setConfirmationText(event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" maxLength={6} />
            <div className="cms-confirm-dialog-actions">
              <button type="button" disabled={workingId !== null} onClick={() => setPendingPurgeUnit(null)}>ยกเลิก</button>
              <button type="button" className="cms-confirm-dialog-danger" disabled={workingId !== null || !confirmationCode || confirmationText.trim() !== confirmationCode} onClick={() => { void handlePurge(pendingPurgeUnit); }}>ลบถาวร</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
