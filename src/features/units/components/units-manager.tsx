"use client";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { showGlobalToast } from "@/components/ui/global-toast";
import type { DemoUnit } from "../demo/model";
import { readUnits, refreshUnits, reorderUnits } from "../demo/storage";

const subscribeToHydration = () => () => undefined;
const pageSize = 10;

function paginationItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
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
    const closeOnScroll = () => setPosition(null);
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPosition(null);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnPointer);
    document.addEventListener("keydown", closeOnKey);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointer);
      document.removeEventListener("keydown", closeOnKey);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
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
  const [units, setUnits] = useState<DemoUnit[]>(() => readUnits(true));
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<DemoUnit | null>(null);
  const [pendingDeleteUnit, setPendingDeleteUnit] = useState<DemoUnit | null>(
    null,
  );
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  async function moveUnit(unit: DemoUnit, direction: "up" | "down") {
    if (reordering || search.trim()) return;
    const index = units.findIndex((entry) => entry.id === unit.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= units.length) return;
    const next = [...units];
    [next[index], next[target]] = [next[target], next[index]];
    setReordering(true);
    setUnits(next);
    try {
      setUnits(await reorderUnits(next.map((entry) => entry.id)));
      showGlobalToast({
        title: "จัดลำดับแล้ว",
        description: `เลื่อน “${unit.name}”${direction === "up" ? "ขึ้น" : "ลง"}เรียบร้อย`,
        variant: "success",
      });
    } catch (error) {
      setUnits(await refreshUnits(true).catch(() => units));
      showGlobalToast({
        title: "จัดลำดับไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
        variant: "error",
      });
    } finally {
      setReordering(false);
    }
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
      setUnits(await refreshUnits(true));
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
      setUnits(await refreshUnits(true));
      showGlobalToast({
        title: "ลบกลุ่มงานแล้ว",
        description: `ลบ “${unit.name}” ออกจากระบบเรียบร้อย`,
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
  useEffect(() => {
    let active = true;
    void refreshUnits(true)
      .then((rows) => {
        if (active) setUnits(rows);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const tableLoading = !hydrated || loading;
  const filtered = units.filter((unit) =>
    unit.name.toLocaleLowerCase("th").includes(search.toLocaleLowerCase("th")),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visibleUnits = filtered.slice(pageStart, pageStart + pageSize);
  const pageNumbers = paginationItems(safePage, totalPages);
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
        <span>
          {tableLoading ? "กำลังโหลด..." : `${filtered.length} หน่วยงาน`}
        </span>
      </div>
      <section className="units-table" aria-busy={tableLoading}>
        <div
          className="admin-list-table-scroll"
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
                <th>ส่วนประกอบ</th>
                <th>สถานะ</th>
                <th>อัปเดตล่าสุด</th>
                <th className="units-actions-heading" scope="col">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <AdminTableLoadingRows columns={7} />
              ) : loadError ? (
                <tr>
                  <td colSpan={7}>
                    <div className="units-empty" role="alert">
                      <AlertCircle size={28} />
                      <strong>โหลดรายการหน่วยงานไม่สำเร็จ</strong>
                      <p>กรุณาลองโหลดหน้านี้ใหม่อีกครั้ง</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleUnits.map((unit) => {
                  const orderIndex = units.findIndex(
                    (entry) => entry.id === unit.id,
                  );
                  const searching = Boolean(search.trim());
                  return (
                    <tr key={unit.id}>
                      <td>
                        <div className="category-arrow-order unit-arrow-order">
                          <span>{orderIndex + 1}</span>
                          <div>
                            <button
                              type="button"
                              disabled={
                                reordering || searching || orderIndex === 0
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
                                orderIndex === units.length - 1
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
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="unit-name">
                          <span>
                            <Building2 size={18} />
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
                        <span className="unit-section-count">
                          {
                            unit.sectionOrder.filter(
                              (section) => unit.sectionVisibility[section],
                            ).length
                          }{" "}
                          ส่วน
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={unit.status} />
                        {unit.hasUnpublishedChanges ? (
                          <small className="unit-pending-draft">
                            มีร่างค้าง
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <small>{unit.updatedAt}</small>
                      </td>
                      <td>
                        <div className="unit-actions">
                          <Link
                            href={`/admin/units/${unit.id}/edit`}
                            aria-label={`แก้ไข ${unit.name}`}
                          >
                            <Pencil size={17} />
                          </Link>
                          {unit.status === "published" && unit.publishedSlug ? (
                            <Link
                              href={`/units/${unit.publishedSlug}`}
                              target="_blank"
                              aria-label={`ดู ${unit.name}`}
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!tableLoading && !loadError && filtered.length === 0 ? (
          <div className="units-empty">
            <Search size={28} />
            <strong>ไม่พบกลุ่มงาน</strong>
            <p>ลองเปลี่ยนคำค้นหา หรือสร้างกลุ่มงานใหม่</p>
          </div>
        ) : !tableLoading && !loadError ? (
          <div className="pages-pagination units-pagination">
            <p>
              แสดง {pageStart + 1}–
              {Math.min(pageStart + pageSize, filtered.length)} จาก{" "}
              {filtered.length} รายการ
            </p>
            <nav aria-label="เปลี่ยนหน้ารายการหน่วยงาน">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setCurrentPage(safePage - 1)}
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((page, index) => (
                <span key={page}>
                  {index > 0 && page - pageNumbers[index - 1] > 1 ? (
                    <i>…</i>
                  ) : null}
                  <button
                    type="button"
                    className={page === safePage ? "active" : ""}
                    aria-current={page === safePage ? "page" : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </span>
              ))}
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                aria-label="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
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
          description="กลุ่มงานจะถูกลบถาวร หากยังมีข่าว เอกสาร หรือถูกใช้กำหนดสิทธิ์ ระบบจะไม่อนุญาตให้ลบ"
          confirmLabel="ลบกลุ่มงาน"
          pending={workingId === pendingDeleteUnit.id}
          onClose={() => {
            if (!workingId) setPendingDeleteUnit(null);
          }}
          onConfirm={() => {
            void handleDelete(pendingDeleteUnit);
          }}
        />
      ) : null}
    </div>
  );
}
