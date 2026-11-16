"use client";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DemoPageStatus, DemoPageSummary } from "../demo/pages";
import {
  actOnPageSummary,
  fetchDeletedPageSummaries,
  pagesChangeEvent,
  readPageSummaries,
  refreshPageSummaries,
} from "../demo/page-list-storage";
import { isReservedPagePath } from "../reserved-paths";

const subscribeToHydration = () => () => undefined;
function normalizePath(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-/]/g, "")
    .replace(/\/{2,}/g, "/");
}

export function PagesManager({
  initialPages,
  initialDeletedPages,
}: {
  initialPages: DemoPageSummary[];
  initialDeletedPages: DemoPageSummary[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const router = useRouter();
  const [pages, setPages] = useState(initialPages);
  const [deletedPages, setDeletedPages] = useState(initialDeletedPages);
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DemoPageStatus | "trash">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<DemoPageSummary | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: "delete" | "restore" | "purge";
    page: DemoPageSummary;
  } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const query = search.trim().toLocaleLowerCase("th");
  const sourcePages = filter === "trash" ? deletedPages : pages;
  const filtered = sourcePages.filter(
    (page) =>
      (!query || page.name.toLocaleLowerCase("th").includes(query)) &&
      (filter === "all" || filter === "trash" || page.status === filter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const visiblePages = filtered.slice(pageStart, pageStart + pageSize);
  function selectFilter(next: typeof filter) {
    setFilter(next);
    setCurrentPage(1);
  }

  useEffect(() => {
    if (openMenu === null) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-page-row-menu]"))
        return;
      setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [openMenu]);
  useEffect(() => {
    const refresh = () => {
      setPages(readPageSummaries());
    };
    const fetchPages = () => {
      void Promise.all([refreshPageSummaries(), fetchDeletedPageSummaries()])
        .then(([active, deleted]) => {
          setPages(active);
          setDeletedPages(deleted);
        })
        .catch(() => undefined);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    fetchPages();
    window.addEventListener(pagesChangeEvent, refresh);
    window.addEventListener("focus", fetchPages);
    window.addEventListener("pageshow", fetchPages);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener(pagesChangeEvent, refresh);
      window.removeEventListener("focus", fetchPages);
      window.removeEventListener("pageshow", fetchPages);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);
  if (!hydrated) return <AdminContentLoading />;
  async function act(
    page: DemoPageSummary,
    action:
      | "duplicate"
      | "unpublish"
      | "delete"
      | "restore"
      | "purge"
      | "metadata",
    values?: { name: string; path: string },
  ) {
    setOpenMenu(null);
    setActionError("");
    setActionPending(true);
    try {
      await actOnPageSummary(page.id, action, page.revision, values);
      setPages(readPageSummaries());
      setPendingAction(null);
      setEditing(null);
      setDeletedPages(await fetchDeletedPageSummaries());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "จัดการหน้าไม่สำเร็จ",
      );
    } finally {
      setActionPending(false);
    }
  }
  function duplicate(page: DemoPageSummary) {
    void act(page, "duplicate");
  }
  function unpublish(id: string) {
    const page = pages.find((item) => item.id === id);
    if (page) void act(page, "unpublish");
  }
  function saveMetadata(next: DemoPageSummary) {
    void act(next, "metadata", { name: next.name, path: next.path });
  }
  return (
    <div className="pages-manager">
      <header className="pages-heading">
        <div>
          <h1>หน้าเว็บไซต์</h1>
          <p>จัดการหน้าเว็บไซต์ทั้งหมดของโรงพยาบาล</p>
        </div>
        <Link href="/admin/pages/new" className="primary-button">
          <Plus size={16} />
          สร้างหน้าใหม่
        </Link>
      </header>
      {actionError ? (
        <p role="alert" className="create-page-error">
          {actionError}
        </p>
      ) : null}
      <section
        className="pages-summary document-summary"
        aria-label="สรุปหน้าเว็บไซต์"
      >
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => selectFilter("all")}
        >
          <span className="document-summary-icon">
            <FileText size={19} />
          </span>
          <span className="document-summary-copy">
            ทั้งหมด<strong>{pages.length}</strong>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={filter === "published"}
          onClick={() => selectFilter("published")}
        >
          <span className="document-summary-icon">
            <Globe2 size={19} />
          </span>
          <span className="document-summary-copy">
            เผยแพร่แล้ว
            <strong>
              {pages.filter((page) => page.status === "published").length}
            </strong>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={filter === "draft"}
          onClick={() => selectFilter("draft")}
        >
          <span className="document-summary-icon">
            <Archive size={19} />
          </span>
          <span className="document-summary-copy">
            ฉบับร่าง
            <strong>
              {pages.filter((page) => page.status === "draft").length}
            </strong>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={filter === "trash"}
          onClick={() => selectFilter("trash")}
        >
          <span className="document-summary-icon">
            <Trash2 size={19} />
          </span>
          <span className="document-summary-copy">
            อยู่ในถังขยะ<strong>{deletedPages.length}</strong>
          </span>
        </button>
      </section>
      <div className="pages-toolbar">
        <label>
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาหน้า..."
          />
          <span className="sr-only">ค้นหาหน้าเว็บไซต์</span>
        </label>
      </div>
      <div
        className="news-list-switch"
        role="group"
        aria-label="เลือกรายการหน้าเว็บไซต์"
      >
        <button
          type="button"
          className={filter !== "trash" ? "active" : ""}
          aria-pressed={filter !== "trash"}
          onClick={() => selectFilter("all")}
        >
          รายการหน้าเว็บไซต์
        </button>
        <button
          type="button"
          className={filter === "trash" ? "active" : ""}
          aria-pressed={filter === "trash"}
          onClick={() => selectFilter("trash")}
        >
          <Trash2 size={15} />
          ถังขยะ{deletedPages.length ? ` (${deletedPages.length})` : ""}
        </button>
      </div>
      <section className="pages-table-card admin-data-table">
        {sourcePages.length === 0 ? (
          <EmptyState
            icon={filter === "trash" ? Archive : FileText}
            title={filter === "trash" ? "ถังขยะว่าง" : "ยังไม่มีหน้าเว็บไซต์"}
            description={
              filter === "trash"
                ? "หน้าที่ลบจะมาแสดงที่นี่และสามารถกู้คืนได้"
                : "สร้างหน้าแรกเพื่อเริ่มต้นจัดเว็บไซต์"
            }
            actionLabel={filter === "trash" ? undefined : "สร้างหน้า"}
            onAction={
              filter === "trash"
                ? undefined
                : () => router.push("/admin/pages/home/builder")
            }
          />
        ) : (
          <>
            <div className="pages-table-scroll admin-data-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>หน้า</th>
                    <th>Slug</th>
                    <th>สถานะ</th>
                    <th>อัปเดตล่าสุด</th>
                    <th
                      className="admin-table-actions-heading"
                      aria-label="การจัดการ"
                    >
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePages.map((page) => (
                    <tr key={page.id}>
                      <td>
                        <div className="page-name admin-table-primary">
                          <span>
                            <FileText size={18} />
                          </span>
                          <div>
                            <strong>{page.name}</strong>
                            <small>
                              {page.blocks} blocks
                              {page.locked ? " · หน้าหลัก" : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>/{page.path}</code>
                      </td>
                      <td>
                        {filter === "trash" ? (
                          <span className="page-status draft">ถังขยะ</span>
                        ) : (
                          <StatusBadge status={page.status} />
                        )}
                      </td>
                      <td>
                        <span className="table-muted">{page.updatedAt}</span>
                      </td>

                      <td>
                        <div className="page-actions admin-table-actions">
                          {filter === "trash" ? (
                            <>
                              <button
                                type="button"
                                className="page-restore-button"
                                title="กู้คืนหน้า"
                                aria-label={`กู้คืนหน้า ${page.name}`}
                                onClick={() =>
                                  setPendingAction({ action: "restore", page })
                                }
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button
                                type="button"
                                className="page-purge-button"
                                title="ลบถาวร"
                                aria-label={`ลบหน้า ${page.name} ถาวร`}
                                onClick={() =>
                                  setPendingAction({ action: "purge", page })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/admin/pages/${page.id}/builder`}
                                title="แก้ไขเนื้อหา"
                                aria-label={`แก้ไขเนื้อหา ${page.name}`}
                              >
                                <Pencil size={16} />
                              </Link>
                              <Link
                                href={page.path ? `/${page.path}` : "/"}
                                target="_blank"
                                title="ดูตัวอย่าง"
                                aria-label={`ดูตัวอย่าง ${page.name}`}
                              >
                                <Eye size={16} />
                              </Link>
                              <div data-page-row-menu>
                                <button
                                  type="button"
                                  title="ตัวเลือกเพิ่มเติม"
                                  aria-label={`ตัวเลือก ${page.name}`}
                                  onClick={() =>
                                    setOpenMenu(
                                      openMenu === page.id ? null : page.id,
                                    )
                                  }
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                                {openMenu === page.id ? (
                                  <div className="page-row-menu">
                                    {!page.locked ? (
                                      <button
                                        onClick={() => {
                                          setEditing(page);
                                          setOpenMenu(null);
                                        }}
                                      >
                                        <Pencil size={14} />
                                        แก้ชื่อและ Slug
                                      </button>
                                    ) : null}
                                    <button onClick={() => duplicate(page)}>
                                      <Copy size={14} />
                                      ทำสำเนา
                                    </button>
                                    {page.status === "published" &&
                                    !page.locked ? (
                                      <button
                                        onClick={() => unpublish(page.id)}
                                      >
                                        <EyeOff size={14} />
                                        ยกเลิกเผยแพร่
                                      </button>
                                    ) : null}
                                    {!page.locked ? (
                                      <button
                                        className="danger"
                                        onClick={() => {
                                          setPendingAction({
                                            action: "delete",
                                            page,
                                          });
                                          setOpenMenu(null);
                                        }}
                                      >
                                        <Trash2 size={14} />
                                        ย้ายไปถังขยะ
                                      </button>
                                    ) : (
                                      <small>หน้าแรกไม่สามารถลบได้</small>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="ไม่พบหน้าที่ค้นหา"
                description="ลองปรับคำค้นหาหรือตัวกรองสถานะ"
              />
            ) : (
              <AdminTablePagination
                page={safePage}
                pageCount={totalPages}
                pageSize={pageSize}
                total={filtered.length}
                label="เปลี่ยนหน้ารายการเว็บไซต์"
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </section>
      {editing ? (
        <PageMetadataDialog
          page={editing}
          pages={pages}
          onClose={() => setEditing(null)}
          onSave={saveMetadata}
        />
      ) : null}
      {pendingAction ? (
        <ConfirmDialog
          title={
            pendingAction.action === "restore"
              ? `กู้คืนหน้า “${pendingAction.page.name}”?`
              : pendingAction.action === "purge"
                ? `ลบหน้า “${pendingAction.page.name}” ถาวร?`
                : `ย้ายหน้า “${pendingAction.page.name}” ไปถังขยะ?`
          }
          description={
            pendingAction.action === "restore"
              ? "หน้าจะกลับสู่รายการเป็นฉบับร่าง และยังไม่แสดงบนเว็บไซต์จนกว่าจะเผยแพร่ใหม่"
              : pendingAction.action === "purge"
                ? "หน้าและสิทธิ์การเข้าถึงที่เกี่ยวข้องจะถูกลบออกจากฐานข้อมูล และไม่สามารถกู้คืนได้"
                : "หน้าจะถูกซ่อนจากรายการจัดการและเว็บไซต์ และสามารถกู้คืนภายหลังได้"
          }
          confirmLabel={
            pendingAction.action === "restore"
              ? "กู้คืนหน้า"
              : pendingAction.action === "purge"
                ? "ลบถาวร"
                : "ย้ายไปถังขยะ"
          }
          variant={pendingAction.action === "restore" ? "default" : "danger"}
          pending={actionPending}
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            void act(pendingAction.page, pendingAction.action);
          }}
        />
      ) : null}
    </div>
  );
}

function PageMetadataDialog({
  page,
  pages,
  onClose,
  onSave,
}: {
  page: DemoPageSummary;
  pages: DemoPageSummary[];
  onClose: () => void;
  onSave: (page: DemoPageSummary) => void;
}) {
  const [name, setName] = useState(page.name);
  const [path, setPath] = useState(page.path);
  const [error, setError] = useState("");
  function save() {
    const normalized = normalizePath(path);
    const root = normalized.split("/")[0] ?? "";
    if (!name.trim()) return setError("กรุณากรอกชื่อหน้า");
    if (!normalized) return setError("กรุณากรอก Slug");
    if (isReservedPagePath(normalized))
      return setError(`ไม่สามารถใช้ /${root} ได้ เนื่องจากเป็นเส้นทางของระบบ`);
    if (
      normalized.includes("..") ||
      pages.some((item) => item.id !== page.id && item.path === normalized)
    )
      return setError("Slug นี้ถูกใช้งานแล้ว กรุณาเลือก Slug อื่น");
    onSave({ ...page, name: name.trim(), path: normalized });
  }
  const previewPath = normalizePath(path);
  return (
    <div className="page-dialog-layer">
      <button
        className="page-dialog-backdrop"
        onClick={onClose}
        aria-label="ปิด"
      />
      <form
        className="page-metadata-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-metadata-title"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <header>
          <span>
            <Pencil size={18} />
          </span>
          <div>
            <strong id="page-metadata-title">แก้ไขชื่อและ Slug</strong>
            <small>เปลี่ยนข้อมูลที่ใช้แสดงและ URL ของหน้าเว็บไซต์</small>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <div className="page-dialog-body">
          <label>
            <span>
              ชื่อหน้า <em>*</em>
            </span>
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="ชื่อหน้าเว็บไซต์"
            />
            <small>ชื่อนี้จะแสดงในหน้าจัดการและส่วนที่อ้างอิงหน้านี้</small>
          </label>
          <label>
            <span>
              Slug <em>*</em>
            </span>
            <div className="page-slug-input">
              <span>เว็บไซต์/</span>
              <input
                value={path}
                onChange={(event) => {
                  setPath(event.target.value);
                  setError("");
                }}
                placeholder="about-us"
              />
            </div>
            <small>ใช้ตัวอักษรอังกฤษ ตัวเลข ขีดกลาง และ / สำหรับหน้าซ้อน</small>
          </label>
          <div className="page-url-preview">
            <Globe2 size={17} />
            <span>
              <small>URL หลังบันทึก</small>
              <strong>/{previewPath || "slug-ของหน้า"}</strong>
            </span>
          </div>
          <p className="page-slug-warning">
            การเปลี่ยน Slug จะทำให้ URL เดิมของหน้านี้เปลี่ยนไป
          </p>
          {error ? <p className="create-page-error">{error}</p> : null}
        </div>
        <footer>
          <button type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="submit" className="primary-button">
            บันทึกการเปลี่ยนแปลง
          </button>
        </footer>
      </form>
    </div>
  );
}
