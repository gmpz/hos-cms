"use client";

import { createId } from "@/utils/create-id";

import {
  Archive,
  Download,
  Eye,
  FileText,
  FolderArchive,
  EyeOff,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { showGlobalToast } from "@/components/ui/global-toast";
import { NativeSelect } from "@/components/ui/native-select";
import Link from "next/link";
import { createPortal } from "react-dom";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AdminTableLoadingRows } from "@/components/admin/admin-content-loading";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";
import { PublishDropdown } from "@/components/admin/publish-dropdown";
import { MediaPicker } from "@/features/media/components/media-picker";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { getDemoMediaItem, mediaChangeEvent } from "@/features/media/demo/media-registry";
import { documentMedia } from "@/features/documents/document-media";
import type { DemoMediaItem } from "@/features/media/demo/media-items";
import { readUnits, refreshUnits } from "@/features/units/demo/storage";
import {
  createDemoDocument,
  type DemoDocument,
  type DemoDocumentStatus,
} from "../demo/model";
import { actOnDocument, fetchAdminDocumentPage, saveDocument, type DocumentPage } from "../demo/storage";
import { CategorySelect } from "@/features/categories/components/category-select";
import { documentFileName, documentFileUrl } from "../document-file-name";
import { recordDocumentAccess } from "../record-document-access";
import {
  categoriesChangedEvent,
  categoryName,
  readCategories,
} from "@/features/categories/demo/storage";

const subscribeToHydration = () => () => undefined;
const confirmationCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newConfirmationCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => confirmationCharacters[byte % confirmationCharacters.length]).join("");
}


function DocumentActionsMenu({
  document,
  showTrash,
  disabled,
  onEdit,
  onAction,
  onFileAccess,
}: {
  document: DemoDocument;
  showTrash: boolean;
  disabled: boolean;
  onEdit: () => void;
  onAction: (action: "unpublish" | "delete" | "restore" | "purge") => void;
  onFileAccess: () => void;
}) {
  const media = documentMedia(document);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const closeOnPointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
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
    window.document.addEventListener("pointerdown", closeOnPointer);
    window.document.addEventListener("keydown", closeOnKey);

    window.addEventListener("resize", closeOnResize);
    return () => {
      window.document.removeEventListener("pointerdown", closeOnPointer);
      window.document.removeEventListener("keydown", closeOnKey);
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
    const menuWidth = 188;
    const itemCount = (media?.previewUrl ? 1 : 0) + (showTrash ? 1 : document.status === "published" ? 2 : 1);
    const menuHeight = itemCount * 40 + 12;
    setPosition({
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: rect.bottom + menuHeight + 8 > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
    });
  }

  return (
    <>
      {showTrash ? (
        <button type="button" className="document-edit-button" disabled={disabled} onClick={() => onAction("restore")} aria-label={`กู้คืน ${document.title}`} title="กู้คืน"><RotateCcw size={16} /></button>
      ) : (
        <>
          <button type="button" className="document-edit-button" disabled={disabled} onClick={onEdit} aria-label={`แก้ไข ${document.title}`} title="แก้ไข"><Pencil size={16} /></button>
          {document.status === "published" && media ? (
            <a className="document-edit-button document-view-button" href={documentFileUrl(document.id, document.title, media.mimeType)} target="_blank" rel="noopener noreferrer" aria-label={`เปิด ${document.title}`} title="เปิดเอกสาร" onClick={() => { recordDocumentAccess(document.id, media.mimeType === "application/pdf" ? "open" : "download"); onFileAccess(); }}><Eye size={16} /></a>
          ) : (
            <button type="button" className="document-edit-button" disabled aria-label={`ยังเปิด ${document.title} ไม่ได้`} title="เผยแพร่เอกสารและแนบไฟล์ก่อนจึงจะเปิดได้"><Eye size={16} /></button>
          )}
        </>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="document-edit-button document-more-button"
        disabled={disabled}
        aria-label={`ตัวเลือกสำหรับ ${document.title}`}
        aria-haspopup="true"
        aria-expanded={Boolean(position)}
        onClick={toggleMenu}
        title="ตัวเลือกเพิ่มเติม"
      ><MoreHorizontal size={18} /></button>
      {position ? createPortal(
        <div ref={menuRef} className="document-actions-menu" style={position}>
          {media?.previewUrl ? <a href={document.status === "published" && !showTrash ? documentFileUrl(document.id, document.title, media.mimeType, "download") : media.previewUrl} download={document.status === "published" && !showTrash ? undefined : documentFileName(document.title, media.mimeType)} onClick={() => { setPosition(null); if (document.status === "published" && !showTrash) { recordDocumentAccess(document.id, "download"); onFileAccess(); } }}><Download size={16} />ดาวน์โหลด</a> : null}
          {!showTrash && document.status === "published" ? <button type="button" onClick={() => { setPosition(null); onAction("unpublish"); }}><EyeOff size={16} />ยกเลิกเผยแพร่</button> : null}
          {!showTrash ? <button type="button" className="danger" onClick={() => { setPosition(null); onAction("delete"); }}><Trash2 size={16} />ย้ายไปถังขยะ</button> : null}
          {showTrash ? <button type="button" className="danger" onClick={() => { setPosition(null); onAction("purge"); }}><Trash2 size={16} />ลบถาวร</button> : null}
        </div>,
        window.document.body,
      ) : null}
    </>
  );
}

export function DocumentsManager() {
  const [, setMediaRevision] = useState(0);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [documentPage, setDocumentPage] = useState<DocumentPage | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: "unpublish" | "delete" | "restore" | "purge"; document: DemoDocument } | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const setToast = showGlobalToast;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | DemoDocumentStatus>("all");
  const [category, setCategory] = useState("all");
  const [fiscalYear, setFiscalYear] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<DemoDocument | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [categories, setCategories] = useState(() =>
    readCategories("documents"),
  );
  const queryKey = JSON.stringify([currentPage, pageSize, debouncedSearch, category, status, fiscalYear, showTrash, refreshKey]);
  const loading = !hydrated || loadedKey !== queryKey;

  useEffect(() => {
    const refreshMedia = () => setMediaRevision((revision) => revision + 1);
    window.addEventListener(mediaChangeEvent, refreshMedia);
    void refreshUnits(true).catch(() => undefined);
    const refreshCategories = () => setCategories(readCategories("documents"));
    window.addEventListener(categoriesChangedEvent, refreshCategories);
    return () => {
      window.removeEventListener(mediaChangeEvent, refreshMedia);
      window.removeEventListener(categoriesChangedEvent, refreshCategories);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = JSON.stringify([currentPage, pageSize, debouncedSearch, category, status, fiscalYear, showTrash, refreshKey]);
    void fetchAdminDocumentPage({ page: currentPage, size: pageSize, search: debouncedSearch, category, status, year: fiscalYear, trash: showTrash }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDocumentPage(result);
        setLoadError("");
        setLoadedKey(requestKey);
        if (fiscalYear !== "all" && !result.years.includes(Number(fiscalYear))) setFiscalYear("all");
        if (result.page !== currentPage) setCurrentPage(result.page);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "โหลดเอกสารไม่สำเร็จ");
        setDocumentPage(null);
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [currentPage, pageSize, debouncedSearch, category, status, fiscalYear, showTrash, refreshKey]);

  const total = documentPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = documentPage?.page ?? currentPage;
  const visibleDocuments = documentPage?.items ?? [];

  function filterBySummary(nextStatus: "all" | "published" | "draft" | "trash") {
    setShowTrash(nextStatus === "trash");
    setStatus(nextStatus === "trash" ? "all" : nextStatus);
    setCurrentPage(1);
  }


  async function persist(document: DemoDocument) {
    setSaveError("");
    try {
      await saveDocument(document);
      setRefreshKey((value) => value + 1);
      setEditing(null);
      setToast({
        id: createId(),
        title: document.status === "published" ? "เผยแพร่เอกสารแล้ว" : "บันทึกฉบับร่างแล้ว",
        description: `“${document.title}” ${document.status === "published" ? "พร้อมแสดงบนเว็บไซต์" : "บันทึกไว้เพื่อแก้ไขหรือเผยแพร่ภายหลัง"}`,
        variant: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "บันทึกเอกสารไม่สำเร็จ";
      setSaveError(message);
      setToast({ id: createId(), title: "บันทึกเอกสารไม่สำเร็จ", description: message, variant: "error" });
    }
  }

  async function runAction(document: DemoDocument, action: "unpublish" | "delete" | "restore" | "purge") {
    if (workingId) return;
    setWorkingId(document.id);
    try {
      await actOnDocument(document, action);
      setRefreshKey((value) => value + 1);
      setToast({ id: createId(), title: action === "unpublish" ? "ยกเลิกเผยแพร่แล้ว" : action === "restore" ? "กู้คืนเอกสารแล้ว" : action === "purge" ? "ลบเอกสารถาวรแล้ว" : "ย้ายเอกสารไปถังขยะแล้ว", description: `“${document.title}” ${action === "unpublish" ? "กลับเป็นฉบับร่าง" : action === "restore" ? "กลับสู่รายการเป็นฉบับร่าง" : action === "purge" ? "ถูกลบถาวรแล้ว โดยไฟล์ยังอยู่ในคลังสื่อ" : "สามารถกู้คืนได้จากถังขยะ"}`, variant: "success" });
    } catch (error) {
      setToast({ id: createId(), title: "จัดการเอกสารไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setWorkingId(null);
      setPendingAction(null);
    }
  }

  return (
    <div className="documents-manager">
      {!loading && loadError ? <p className="document-error" role="alert">{loadError}</p> : null}
      <header className="documents-heading">
        <div>
          <h1>เอกสารเผยแพร่</h1>
          <p>จัดหมวดหมู่เอกสารและเลือกไฟล์จากคลังสื่อเพื่อเผยแพร่บนเว็บไซต์</p>
        </div>
        <div className="news-heading-actions documents-heading-actions">
          <Link
            href="/admin/categories?scope=documents"
            className="secondary-button"
          >
            จัดการหมวดหมู่
          </Link>
          <button
            className="primary-button"
            onClick={() => { setEditingIsNew(true); setEditing(createDemoDocument()); }}
          >
            <Plus size={16} />
            เพิ่มเอกสาร
          </button>
        </div>
      </header>
      <section className="document-summary" aria-label="กรองเอกสารตามสถานะ">
        <button type="button" aria-pressed={!showTrash && status === "all"} onClick={() => filterBySummary("all")}>
          <span className="document-summary-icon"><FolderArchive size={19} /></span>
          <span className="document-summary-copy">เอกสารทั้งหมด<strong>{documentPage?.counts.active ?? "—"}</strong></span>
        </button>
        <button type="button" aria-pressed={!showTrash && status === "published"} onClick={() => filterBySummary("published")}>
          <span className="document-summary-icon"><FileText size={19} /></span>
          <span className="document-summary-copy">เผยแพร่แล้ว<strong>{documentPage?.counts.published ?? "—"}</strong></span>
        </button>
        <button type="button" aria-pressed={!showTrash && status === "draft"} onClick={() => filterBySummary("draft")}>
          <span className="document-summary-icon"><Archive size={19} /></span>
          <span className="document-summary-copy">ฉบับร่าง<strong>{documentPage?.counts.draft ?? "—"}</strong></span>
        </button>
        <button type="button" aria-pressed={showTrash} onClick={() => filterBySummary("trash")}>
          <span className="document-summary-icon"><Trash2 size={19} /></span>
          <span className="document-summary-copy">อยู่ในถังขยะ<strong>{documentPage?.counts.trash ?? "—"}</strong></span>
        </button>
      </section>
      <div className="documents-toolbar">
        <label className="documents-search">
          <Search size={18} />
          <input
            value={search}
            maxLength={200}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อหรือเลขที่เอกสาร..."
          />
        </label>
        {hydrated ? <CategorySelect
          scope="documents"
          value={category === "all" ? null : category}
          allowAll
          label="กรองหมวดหมู่"
          showManageLink={false}
          onChange={(categoryId) => {
            setCategory(categoryId ?? "all");
            setCurrentPage(1);
          }}
        /> : <div className="category-select-field"><span>กรองหมวดหมู่</span><div><NativeSelect aria-label="กรองหมวดหมู่" disabled><option>ทุกหมวดหมู่</option></NativeSelect></div></div>}
        <label className="documents-year-filter">
          <span>ปีงบประมาณ</span>
          <NativeSelect aria-label="กรองปีงบประมาณเอกสาร" value={fiscalYear} onChange={(event) => { setFiscalYear(event.target.value); setCurrentPage(1); }}>
            <option value="all">ทุกปีงบประมาณ</option>
            {(documentPage?.years ?? []).map((year) => <option key={year} value={year}>{year}</option>)}
          </NativeSelect>
        </label>
        <label className="documents-status-filter">
          <span>กรองสถานะ</span>
          <NativeSelect
            aria-label="กรองสถานะเอกสาร"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setShowTrash(false);
              setCurrentPage(1);
            }}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="published">เผยแพร่</option>
            <option value="draft">ฉบับร่าง</option>
            <option value="archived">เก็บถาวร</option>
          </NativeSelect>
        </label>
      </div>
      <div className="news-list-switch"><button type="button" className={!showTrash ? "active" : ""} onClick={() => { setShowTrash(false); setCurrentPage(1); }}>รายการเอกสาร</button><button type="button" className={showTrash ? "active" : ""} onClick={() => filterBySummary("trash")}><Trash2 size={15} />ถังขยะ{documentPage?.counts.trash ? ` (${documentPage.counts.trash})` : ""}</button></div>
      <p className="documents-table-scroll-hint">เลื่อนตารางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด</p>
      <section className="documents-table admin-data-table" aria-busy={loading}>
        <div className="documents-table-scroll admin-data-table-scroll" tabIndex={0} role="region" aria-label="ตารางรายการเอกสาร เลื่อนซ้ายขวาได้">
        <table>
          <thead>
            <tr>
              <th>เอกสาร</th>
              <th>หมวดหมู่</th>
              <th>เจ้าของ</th>
              <th>ปีงบประมาณ</th>
              <th>สถานะ</th>
              <th>การเข้าถึงไฟล์</th>
              <th className="admin-table-actions-heading">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <AdminTableLoadingRows kind="documents" /> : loadError ? <tr><td colSpan={7}><div className="document-table-loading"><button type="button" className="secondary-button" onClick={() => setRefreshKey((value) => value + 1)}>ลองโหลดอีกครั้ง</button></div></td></tr> : total === 0 ? <tr><td colSpan={7}><div className="documents-empty"><Search size={27} /><strong>{showTrash ? "ไม่มีเอกสารในถังขยะ" : "ไม่พบเอกสาร"}</strong><p>{showTrash ? "เอกสารที่ลบจะอยู่ที่นี่เพื่อให้กู้คืนหรือลบถาวร" : "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"}</p></div></td></tr> : visibleDocuments.map((document) => (
              <tr key={document.id}>
                <td>
                  <div className="document-title-cell admin-table-primary">
                    <DocumentFileIcon
                      file={documentMedia(document)}
                      size={28}
                    />
                    <div>
                      <strong>{document.title}</strong>
                      {/* <small>
                        {document.documentNumber ||
                          document.description ||
                          "ยังไม่มีคำอธิบาย"}
                      </small> */}
                    </div>
                  </div>
                </td>
                <td>{categoryName(categories, document.categoryId)}</td>
                <td>{document.owner}</td>
                <td>{document.fiscalYear}</td>
                <td>
                  {showTrash ? <span className="news-deleted-status">อยู่ในถังขยะ</span> : <StatusBadge status={document.status} />}
                </td>
                <td><span className="document-access-counts"><span>เปิด {document.openCount.toLocaleString("th-TH")}</span><span>ดาวน์โหลด {document.downloadCount.toLocaleString("th-TH")}</span></span></td>
                <td>
                  <div className="document-row-actions admin-table-actions">
                    <DocumentActionsMenu
                      document={document}
                      showTrash={showTrash}
                      disabled={workingId !== null}
                      onEdit={() => { setEditingIsNew(false); setEditing(document); }}
                      onAction={(action) => { if (action === "purge") { setConfirmationText(""); setConfirmationCode(newConfirmationCode()); } setPendingAction({ action, document }); }}
                      onFileAccess={() => window.setTimeout(() => setRefreshKey((value) => value + 1), 1000)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {!loading && !loadError && total > 0 ? (
          <AdminTablePagination page={safePage} pageCount={totalPages} pageSize={pageSize} total={total} label="เปลี่ยนหน้ารายการเอกสาร" onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}/>
        ) : null}
      </section>
      {editing ? (
        <DocumentEditor
          document={editing}
          isNew={editingIsNew}
          serverError={saveError}
          onClose={() => { setEditing(null); setSaveError(""); }}
          onSave={persist}
          onUnpublish={() => { setEditing(null); setPendingAction({ action: "unpublish", document: editing }); }}
        />
      ) : null}
      {pendingAction?.action === "purge" ? <div className="modal-layer" onKeyDown={(event) => { if (event.key === "Escape") setPendingAction(null); }}>
        <button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่างยืนยัน" onClick={() => setPendingAction(null)} />
        <div className="cms-confirm-dialog news-purge-dialog" role="alertdialog" aria-modal="true" aria-labelledby="document-purge-title" aria-describedby="document-purge-description">
          <div className="cms-confirm-dialog-icon" aria-hidden="true"><Trash2 size={30} /></div>
          <h2 id="document-purge-title">ลบเอกสารถาวร?</h2>
          <p id="document-purge-description">เอกสาร “{pendingAction.document.title}” จะกู้คืนไม่ได้ แต่ไฟล์ยังอยู่ในคลังสื่อ</p>
          <label htmlFor="document-purge-confirm">พิมพ์รหัส <strong className="news-purge-code">{confirmationCode}</strong> เพื่อยืนยัน</label>
          <input id="document-purge-confirm" autoFocus value={confirmationText} onChange={(event) => setConfirmationText(event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" maxLength={6} />
          <div className="cms-confirm-dialog-actions"><button type="button" onClick={() => setPendingAction(null)}>ยกเลิก</button><button type="button" className="cms-confirm-dialog-danger" disabled={workingId !== null || !confirmationCode || confirmationText.trim() !== confirmationCode} onClick={() => { void runAction(pendingAction.document, "purge"); }}>ลบถาวร</button></div>
        </div>
      </div> : pendingAction ? <ConfirmDialog
        title={pendingAction.action === "restore" ? `กู้คืนเอกสาร “${pendingAction.document.title}”?` : pendingAction.action === "delete" ? `ลบเอกสาร “${pendingAction.document.title}”?` : `ยกเลิกเผยแพร่ “${pendingAction.document.title}”?`}
        description={pendingAction.action === "restore" ? "เอกสารจะกลับสู่รายการเป็นฉบับร่าง และยังไม่แสดงบนเว็บไซต์" : pendingAction.action === "delete" ? "เอกสารจะถูกย้ายไปถังขยะและสามารถกู้คืนได้ ไฟล์ยังอยู่ในคลังสื่อ" : "เอกสารจะไม่แสดงบนเว็บไซต์ และสามารถแก้ไขหรือเผยแพร่ใหม่ได้"}
        confirmLabel={pendingAction.action === "restore" ? "กู้คืนเอกสาร" : pendingAction.action === "delete" ? "ลบเอกสาร" : "ยกเลิกเผยแพร่"}
        variant={pendingAction.action === "delete" ? "danger" : "default"}
        pending={workingId !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => { void runAction(pendingAction.document, pendingAction.action); }}
      /> : null}
    </div>
  );
}

function DocumentEditor({
  document,
  isNew,
  serverError,
  onClose,
  onSave,
  onUnpublish,
}: {
  document: DemoDocument;
  isNew: boolean;
  serverError: string;
  onClose: () => void;
  onSave: (document: DemoDocument) => Promise<void>;
  onUnpublish: () => void;
}) {
  const [value, setValue] = useState(document);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [picker, setPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<DemoMediaItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"title" | "category" | "file", string>>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const fileButtonRef = useRef<HTMLButtonElement>(null);
  const units = readUnits();
  const attachedMedia = documentMedia(document);

  async function save(status: "draft" | "published") {
    if (savingRef.current) return;
    const errors: typeof fieldErrors = {};
    if (!value.title.trim()) errors.title = "กรุณากรอกชื่อเอกสาร";
    if (!readCategories("documents").some((item) => item.id === value.categoryId && item.active)) errors.category = "กรุณาเลือกหมวดหมู่เอกสาร";
    if (status === "published" && value.mediaIds.length === 0) errors.file = "กรุณาเลือกไฟล์ก่อนเผยแพร่เอกสาร";
    setFieldErrors(errors);
    const firstError = (["title", "category", "file"] as const).find((field) => errors[field]);
    if (firstError) {
      const target = firstError === "title" ? titleRef.current : firstError === "category" ? globalThis.document.getElementById("document-category") : fileButtonRef.current;
      window.requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        target?.focus({ preventScroll: true });
      });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave({
        ...value,
        title: value.title.trim(),
        mediaIds: value.mediaIds.slice(0, 1),
        status,
        publishedAt:
          status === "published" ? (value.publishedAt ?? "วันนี้") : null,
        updatedAt: "เมื่อสักครู่",
      });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="document-editor-layer">
      <button
        className="document-editor-backdrop"
        onClick={() => { if (!savingRef.current) onClose(); }}
        aria-label="ปิด"
      />
      <aside
        className="document-editor"
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? "เพิ่มเอกสาร" : "แก้ไขเอกสาร"}
      >
        <header>
          <div>

            <strong>{isNew ? "เพิ่มเอกสาร" : "แก้ไขเอกสาร"}</strong>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="ปิด">
            <X size={19} />
          </button>
        </header>
        <div className="document-editor-body">
          <label>
            <span>ชื่อเอกสาร <em className="admin-required-mark" aria-hidden="true">*</em></span>
            <input
              ref={titleRef}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "document-title-error" : undefined}
              className={fieldErrors.title ? "field-invalid" : undefined}
              value={value.title}
              onChange={(event) => {
                setValue({ ...value, title: event.target.value });
                if (fieldErrors.title) setFieldErrors((current) => ({ ...current, title: undefined }));
              }}
              placeholder="เช่น แบบฟอร์มขอสำเนาเวชระเบียน"
            />
            {fieldErrors.title ? <small id="document-title-error" className="field-error" role="alert">{fieldErrors.title}</small> : null}
          </label>
          <label>
            <span>คำอธิบาย</span>
            <textarea
              rows={3}
              value={value.description}
              onChange={(event) =>
                setValue({ ...value, description: event.target.value })
              }
              placeholder="คำอธิบายสั้น ๆ สำหรับหน้ารวมเอกสาร"
            />
          </label>
          <div className="document-editor-grid">
            <CategorySelect
              scope="documents"
              value={value.categoryId}
              showManageLink={false}
              selectId="document-category"
              error={fieldErrors.category}
              required
              onChange={(categoryId) => {
                if (categoryId) {
                  setValue({ ...value, categoryId });
                  if (fieldErrors.category) setFieldErrors((current) => ({ ...current, category: undefined }));
                }
              }}
            />
            <label>
              <span>เจ้าของเอกสาร</span>
              <NativeSelect
                aria-label="เจ้าของเอกสาร"
                value={value.unitId ?? "hospital"}
                onChange={(event) => {
                  const unitId = event.target.value;
                  const unit = units.find(
                    (item) => item.id === unitId,
                  );
                  setValue({
                    ...value,
                    unitId: unit?.id ?? null,
                    owner: unit?.name ?? "โรงพยาบาล",
                  });
                }}
              >
                <option value="hospital">โรงพยาบาล</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </NativeSelect>
            </label>
          </div>
          <div className="document-editor-grid">
            <label>
              <span>ปีงบประมาณ (พ.ศ.)</span>
              <input
                type="number"
                value={value.fiscalYear}
                onChange={(event) =>
                  setValue({ ...value, fiscalYear: Number(event.target.value) })
                }
              />
            </label>
            <label>
              <span>วันที่เอกสาร</span>
              <input
                type="date"
                value={value.issuedOn}
                onChange={(event) =>
                  setValue({ ...value, issuedOn: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            <span>เลขที่เอกสาร</span>
            <input
              value={value.documentNumber}
              onChange={(event) =>
                setValue({ ...value, documentNumber: event.target.value })
              }
              placeholder="ไม่บังคับ"
            />
          </label>
          <div className="document-file-field">
            <span className="document-file-label" id="document-file-label">ไฟล์แนบ <em className="admin-required-mark" aria-hidden="true">*</em></span>
            <section className="document-files" aria-labelledby="document-file-label">
              <p className="document-file-hint">
                เอกสาร 1 รายการแนบได้ 1 ไฟล์ รองรับ PDF, Word, PowerPoint และ
                Excel
              </p>
              {value.mediaIds.map((id) => {
                const media = selectedMedia?.id === id
                  ? selectedMedia
                  : attachedMedia?.id === id ? attachedMedia : getDemoMediaItem(id);
                return (
                  <article key={id}>
                    <DocumentFileIcon file={media} size={18} />
                    <div>
                      <strong>{media?.name ?? "ไม่พบไฟล์"}</strong>
                      <small>{media?.size ?? id}</small>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMedia(null);
                        setValue({
                          ...value,
                          mediaIds: [],
                        });
                      }}
                      aria-label="นำไฟล์ออก"
                    >
                      <Trash2 size={15} />
                    </button>
                  </article>
                );
              })}
              <button
                ref={fileButtonRef}
                className={`document-add-file${fieldErrors.file ? " field-invalid" : ""}`}
                aria-describedby={fieldErrors.file ? "document-file-error" : undefined}
                onClick={() => setPicker(true)}
              >
                <Upload size={15} />
                {value.mediaIds.length ? "เปลี่ยนไฟล์" : "เลือกไฟล์จากคลังสื่อ"}
              </button>
              {fieldErrors.file ? <small id="document-file-error" className="field-error" role="alert">{fieldErrors.file}</small> : null}
            </section>
          </div>
          {serverError ? <p className="document-error" role="alert">{serverError}</p> : null}
        </div>
        <footer className="document-editor-actions">
          <button type="button" onClick={() => { void save("draft"); }} disabled={saving}>บันทึกฉบับร่าง</button>
          <div className="admin-publish-split">
            <button type="button" className="primary-button" onClick={() => { void save("published"); }} disabled={saving || (document.status === "published" && JSON.stringify(value) === JSON.stringify(document))}>{saving ? <><LoaderCircle size={16} className="document-table-spinner" />กำลังบันทึก...</> : "บันทึกและเผยแพร่"}</button>
            {!isNew && document.status === "published" ? <PublishDropdown disabled={saving} onUnpublish={onUnpublish}/> : null}
          </div>
        </footer>
        {picker ? (
          <MediaPicker
            open
            acceptKind="document"
            currentId={value.mediaIds[0] ?? null}
            onClose={() => setPicker(false)}
            onSelect={(media) => {
              setSelectedMedia(media);
              setValue({ ...value, mediaIds: [media.id] });
              if (fieldErrors.file) setFieldErrors((current) => ({ ...current, file: undefined }));
              setPicker(false);
            }}
          />
        ) : null}
      </aside>
    </div>
  );
}
