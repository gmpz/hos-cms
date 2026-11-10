"use client";

import {
  AlertTriangle,
  Calendar,
  Check,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  LoaderCircle,
  Maximize,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { ActionToast } from "@/components/admin/action-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentFileIcon } from "./document-file-icon";
import type { DemoMediaItem } from "../demo/media-items";
import {
  addUploadedMediaItem,
  getDemoMediaItems,
  MediaInUseError,
  registerDemoMediaItem,
  removeDemoMediaItem,
  toDemoMediaItem,
  type MediaUsage,
} from "../demo/media-registry";
import { fetchMediaLibraryPage, uploadMediaFile, type MediaLibraryPage } from "../upload-media-file";

type View = "grid" | "list";
type Filter = "all" | "image" | "document";
type UploadStatus = "queued" | "uploading" | "saving" | "error" | "canceled";
type UploadTask = {
  id: number;
  file: File;
  status: UploadStatus;
  percent: number | null;
  error: string | null;
  retryable: boolean;
  controller: AbortController | null;
};
type MediaListEntry = { type: "upload"; task: UploadTask } | { type: "media"; item: DemoMediaItem };
const pageSize = 20;
const maxConcurrentUploads = 3;
const maxUploadBytes = 25 * 1024 * 1024;
const supportedUploadTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", "video/mp4",
]);
function uploadValidationError(file: File): string | null {
  if (file.size === 0) return "ไฟล์ว่าง ไม่สามารถอัปโหลดได้";
  if (file.size > maxUploadBytes) return "ไฟล์ต้องมีขนาดไม่เกิน 25 MB";
  if (!supportedUploadTypes.has(file.type)) return "ไม่รองรับประเภทไฟล์นี้";
  return null;
}
function paginationItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
}

export function MediaLibrary() {
  const [items, setItems] = useState<DemoMediaItem[]>([]);
  const [summary, setSummary] = useState<MediaLibraryPage["summary"]>({ image: { count: 0, bytes: 0 }, document: { count: 0, bytes: 0 } });
  const [total, setTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<View>("grid");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState<DemoMediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [blockedDelete, setBlockedDelete] = useState<{ message: string; usages: MediaUsage[] } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTasksRef = useRef<UploadTask[]>([]);
  const nextUploadIdRef = useRef(0);
  const dragDepthRef = useRef(0);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const queryKey = JSON.stringify([filter, debouncedSearch, currentPage]);
  const requestKey = JSON.stringify([queryKey, refreshKey]);
  const loading = loadedKey !== queryKey;
  const totals = summary;
  const entries: MediaListEntry[] = [
    ...(currentPage === 1 ? uploadTasks.map((task): MediaListEntry => ({ type: "upload", task })) : []),
    ...items.map((item): MediaListEntry => ({ type: "media", item })),
  ];
  const displayEntries = loading ? entries.filter((entry) => entry.type === "upload") : entries;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageNumbers = paginationItems(safePage, totalPages);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setCurrentPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMediaLibraryPage({ page: currentPage, kind: filter, search: debouncedSearch, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (currentPage > lastPage) { setCurrentPage(lastPage); return; }
        setItems(result.items.map(toDemoMediaItem));
        setSummary(result.summary);
        setTotal(result.total);
        setLoadError(null);
        setLoadedKey(queryKey);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setLoadError("โหลดรายการคลังสื่อไม่สำเร็จ");
        setLoadedKey(queryKey);
      });
    return () => controller.abort();
  }, [currentPage, filter, debouncedSearch, refreshKey, requestKey, queryKey]);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    const queue = uploadTasksRef;
    return () => queue.current.forEach((task) => task.controller?.abort());
  }, []);

  function publishUploadTasks() {
    setUploadTasks(uploadTasksRef.current.map((task) => ({ ...task })));
  }

  function pumpUploads() {
    let active = uploadTasksRef.current.filter((task) => task.status === "uploading" || task.status === "saving").length;
    while (active < maxConcurrentUploads) {
      const task = uploadTasksRef.current.find((entry) => entry.status === "queued");
      if (!task) break;
      active += 1;
      task.status = "uploading";
      task.controller = new AbortController();
      publishUploadTasks();
      void runUpload(task);
    }
  }

  async function runUpload(task: UploadTask) {
    try {
      const uploaded = await uploadMediaFile(task.file, undefined, {
        signal: task.controller?.signal,
        onProgress: (percent) => {
          if (task.status !== "uploading" || task.percent === percent) return;
          task.percent = percent;
          publishUploadTasks();
        },
        onTransferComplete: () => {
          if (task.status !== "uploading") return;
          task.status = "saving";
          task.percent = 100;
          publishUploadTasks();
        },
      });
      const uploadedItem: DemoMediaItem = {
        id: uploaded.id, name: task.file.name, kind: task.file.type.startsWith("image/") ? "image" : "document",
        mimeType: task.file.type, size: formatBytes(task.file.size), sizeBytes: task.file.size,
        dimensions: task.file.type.startsWith("image/") ? "กำลังตรวจสอบ" : "—",
        uploadedAt: "วันนี้", uploadedBy: "ผู้ดูแลระบบ",
        alt: task.file.name.replace(/\.[^.]+$/, ""), previewUrl: uploaded.url,
        tone: ((getDemoMediaItems().length % 5) + 1),
      };
      addUploadedMediaItem(uploadedItem);
      setItems((current) => [uploadedItem, ...current.filter((item) => item.id !== uploadedItem.id)].slice(0, pageSize));
      setTotal((current) => current + 1);
      setSummary((current) => ({ ...current, [uploadedItem.kind]: {
        count: current[uploadedItem.kind].count + 1, bytes: current[uploadedItem.kind].bytes + uploadedItem.sizeBytes,
      } }));
      uploadTasksRef.current = uploadTasksRef.current.filter((entry) => entry.id !== task.id);
      setSearch("");
      setDebouncedSearch("");
      setFilter("all");
      setCurrentPage(1);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      if (task.controller?.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        task.status = "canceled";
      } else {
        task.status = "error";
        task.error = error instanceof Error ? error.message : "อัปโหลดไฟล์ไม่สำเร็จ";
      }
    } finally {
      task.controller = null;
      publishUploadTasks();
      pumpUploads();
    }
  }

  function addFiles(files: FileList | File[]) {
    const additions = Array.from(files).map((file): UploadTask => {
      const error = uploadValidationError(file);
      return { id: ++nextUploadIdRef.current, file, status: error ? "error" : "queued", percent: 0,
        error, retryable: !error, controller: null };
    });
    if (!additions.length) return;
    uploadTasksRef.current.push(...additions);
    setSearch("");
    setDebouncedSearch("");
    setFilter("all");
    setCurrentPage(1);
    publishUploadTasks();
    pumpUploads();
  }

  function cancelUpload(id: number) {
    const task = uploadTasksRef.current.find((entry) => entry.id === id);
    if (!task || (task.status !== "queued" && task.status !== "uploading")) return;
    task.status = "canceled";
    task.controller?.abort();
    publishUploadTasks();
    pumpUploads();
  }

  function retryUpload(id: number) {
    const task = uploadTasksRef.current.find((entry) => entry.id === id);
    if (!task || task.controller || !task.retryable || (task.status !== "error" && task.status !== "canceled")) return;
    task.status = "queued";
    task.percent = 0;
    task.error = null;
    publishUploadTasks();
    pumpUploads();
  }

  function dismissUpload(id: number) {
    uploadTasksRef.current = uploadTasksRef.current.filter((task) => task.id !== id || task.controller ||
      (task.status !== "error" && task.status !== "canceled"));
    publishUploadTasks();
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    if (event.dataTransfer.files.length)
      addFiles(event.dataTransfer.files);
  }

  async function updateSelected(patch: Pick<DemoMediaItem, "name" | "alt">) {
    if (!selected) throw new Error("ไม่พบไฟล์ที่ต้องการแก้ไข");
    await registerDemoMediaItem({ ...selected, ...patch });
    setItems((current) => current.map((item) => item.id === selected.id ? { ...item, ...patch } : item));
    setRefreshKey((value) => value + 1);
  }

  async function removeSelected() {
    if (!deleteCandidate || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await removeDemoMediaItem(deleteCandidate.id);
      setItems((current) => current.filter((item) => item.id !== deleteCandidate.id));
      setTotal((current) => Math.max(0, current - 1));
      setSummary((current) => ({ ...current, [deleteCandidate.kind]: {
        count: Math.max(0, current[deleteCandidate.kind].count - 1),
        bytes: Math.max(0, current[deleteCandidate.kind].bytes - deleteCandidate.sizeBytes),
      } }));
      setSelectedId(null);
      setDeleteCandidate(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setDeleteCandidate(null);
      if (error instanceof MediaInUseError) setBlockedDelete({ message: error.message, usages: error.usages });
      else setDeleteError(error instanceof Error ? error.message : "ลบไฟล์ไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="media-manager">
      {deleteError ? <ActionToast ok={false} title="ลบไฟล์ไม่สำเร็จ" description={deleteError} onClose={() => setDeleteError(null)}/> : null}
      <header className="media-heading">
        <div>
          <h1>คลังสื่อ</h1>
          <p>จัดการรูปภาพและไฟล์ทั้งหมด</p>
        </div>
        <button
          className="primary-button"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          อัปโหลด
        </button>
      </header>
      <input
        ref={inputRef}
        className="media-file-input"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        className={`media-dropzone ${dragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); dragDepthRef.current += 1; setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); dragDepthRef.current = Math.max(0, dragDepthRef.current - 1); if (!dragDepthRef.current) setDragging(false); }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        onDrop={onDrop}
      >
        <Upload size={29} />
        <strong>{dragging ? "วางไฟล์เพื่ออัปโหลด" : "ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์"}</strong>
        <span>รองรับ JPG, PNG, WebP, GIF, PDF, Office และ MP4 · สูงสุด 25 MB ต่อไฟล์</span>
      </button>
      <section className="media-storage-summary" aria-label="สรุปขนาดไฟล์ในคลังสื่อ">
        <div className="media-storage-card">
          <span className="media-storage-icon"><ImageIcon size={20} aria-hidden="true" /></span>
          <div><span>รูปภาพ</span><strong>{formatTotalBytes(totals.image.bytes)}</strong><small>{totals.image.count.toLocaleString("th-TH")} ไฟล์</small></div>
        </div>
        <div className="media-storage-card">
          <span className="media-storage-icon"><FileText size={20} aria-hidden="true" /></span>
          <div><span>เอกสารและไฟล์อื่น</span><strong>{formatTotalBytes(totals.document.bytes)}</strong><small>{totals.document.count.toLocaleString("th-TH")} ไฟล์</small></div>
        </div>
        <div className="media-storage-card">
          <span className="media-storage-icon"><HardDrive size={20} aria-hidden="true" /></span>
          <div><span>รวมทั้งหมด</span><strong>{formatTotalBytes(totals.image.bytes + totals.document.bytes)}</strong><small>{(totals.image.count + totals.document.count).toLocaleString("th-TH")} ไฟล์</small></div>
        </div>
      </section>
      <div className="media-toolbar">
        <label>
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหา..."
          />
        </label>
        <div className="media-filter">
          {(
            [
              ["all", "ทั้งหมด"],
              ["image", "รูปภาพ"],
              ["document", "เอกสาร"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => {
                setFilter(value);
                setCurrentPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="media-view">
          <button
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
            aria-label="มุมมองตาราง"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
            aria-label="มุมมองรายการ"
          >
            <List size={16} />
          </button>
        </div>
      </div>
      {loading && displayEntries.length === 0 ? <div className="media-empty" role="status"><LoaderCircle className="media-save-spinner" size={28}/><strong>กำลังโหลดไฟล์...</strong></div> : loadError && !loading ? (
        <div className="media-empty" role="alert"><CircleAlert size={28}/><strong>{loadError}</strong><button type="button" className="primary-button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></div>
      ) : displayEntries.length === 0 ? (
        <div className="media-empty">
          <Search size={28} />
          <strong>ไม่พบไฟล์ที่ค้นหา</strong>
          <p>ลองปรับคำค้นหาหรือตัวกรองประเภทไฟล์ หรืออัปโหลดไฟล์ใหม่</p>
        </div>
      ) : view === "grid" ? (
        <div className="media-grid">
          {displayEntries.map((entry) => entry.type === "upload" ?
            <MediaUploadCard key={`upload:${entry.task.id}`} task={entry.task} onCancel={cancelUpload} onRetry={retryUpload} onDismiss={dismissUpload}/> :
            <button key={entry.item.id} className="media-card" onClick={() => setSelectedId(entry.item.id)}>
              <MediaPreview item={entry.item}/>
              <span><strong>{entry.item.name}</strong><small>{entry.item.size}</small></span>
            </button>
          )}
        </div>
      ) : (
        <div className="media-table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อไฟล์</th>
                <th>ขนาด</th>
                <th>มิติ</th>
                <th>วันที่</th>
                <th>อัปโหลดโดย</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {displayEntries.map((entry) => entry.type === "upload" ?
                <MediaUploadRow key={`upload:${entry.task.id}`} task={entry.task} onCancel={cancelUpload} onRetry={retryUpload} onDismiss={dismissUpload}/> :
                <tr key={entry.item.id} onClick={() => setSelectedId(entry.item.id)}>
                  <td><div className="media-file-name"><MediaPreview item={entry.item}/><strong>{entry.item.name}</strong></div></td>
                  <td>{entry.item.size}</td>
                  <td>{entry.item.dimensions}</td>
                  <td>{entry.item.uploadedAt}</td>
                  <td>{entry.item.uploadedBy}</td>
                  <td/>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !loadError && total > 0 ? (
        <div className="pages-pagination media-pagination">
          <p>
            แสดง {pageStart + 1}–
            {Math.min(pageStart + items.length, total)} จาก{" "}
            {total} รายการ
          </p>
          <nav aria-label="เปลี่ยนหน้าคลังสื่อ">
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
      {selected ? (
        <MediaDrawer
          key={selected.id}
          item={selected}
          onClose={() => setSelectedId(null)}
          onSave={updateSelected}
          onDelete={() => setDeleteCandidate(selected)}
        />
      ) : null}
      {deleteCandidate ? <ConfirmDialog title="ลบไฟล์ออกจากคลังสื่อ?" description={`ระบบจะตรวจสอบก่อนว่า “${deleteCandidate.name}” ไม่ได้ถูกใช้งานอยู่ การลบแล้วไม่สามารถกู้คืนได้`} confirmLabel="ตรวจสอบและลบ" pending={deleting} onClose={() => setDeleteCandidate(null)} onConfirm={() => void removeSelected()}/> : null}
      {blockedDelete ? <MediaUsageDialog message={blockedDelete.message} usages={blockedDelete.usages} onClose={() => setBlockedDelete(null)}/> : null}
    </div>
  );
}

type MediaUploadProps = {
  task: UploadTask;
  onCancel: (id: number) => void;
  onRetry: (id: number) => void;
  onDismiss: (id: number) => void;
};

function MediaUploadStatus({ task }: { task: UploadTask }) {
  const active = task.status === "uploading" || task.status === "saving";
  const label = task.status === "queued" ? "รออัปโหลด" : task.status === "uploading"
    ? task.percent === null ? "กำลังอัปโหลด" : `กำลังอัปโหลด ${task.percent}%`
    : task.status === "saving" ? "ส่งไฟล์ครบแล้ว กำลังบันทึก…"
    : task.status === "canceled" ? "ยกเลิกแล้ว" : task.error ?? "อัปโหลดไม่สำเร็จ";
  return <div className="media-upload-status">
    <span aria-live="polite">{label}</span>
    {active ? <div className={`media-upload-progress${task.percent === null ? " indeterminate" : ""}`} role="progressbar"
      aria-label={`อัปโหลด ${task.file.name}`} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={task.percent === null ? undefined : task.percent}>
      <span style={{ width: `${task.percent ?? 0}%` }}/>
    </div> : null}
  </div>;
}

function MediaUploadActions({ task, onCancel, onRetry, onDismiss }: MediaUploadProps) {
  return <div className="media-upload-actions">
    {(task.status === "queued" || task.status === "uploading") ?
      <button type="button" onClick={() => onCancel(task.id)} aria-label={`ยกเลิก ${task.file.name}`} title="ยกเลิก"><X size={17}/></button> : null}
    {(task.status === "error" || task.status === "canceled") && task.retryable && !task.controller ?
      <button type="button" onClick={() => onRetry(task.id)} aria-label={`ลองอัปโหลด ${task.file.name} อีกครั้ง`} title="ลองใหม่"><RotateCcw size={16}/></button> : null}
    {(task.status === "error" || task.status === "canceled") && !task.controller ?
      <button type="button" onClick={() => onDismiss(task.id)} aria-label={`นำ ${task.file.name} ออกจากรายการ`} title="นำออกจากรายการ"><X size={17}/></button> : null}
  </div>;
}

function MediaUploadCard(props: MediaUploadProps) {
  const { task } = props;
  const active = task.status === "uploading" || task.status === "saving";
  return <div className={`media-card media-upload-card ${task.status}`}>
    <div className="media-preview media-upload-preview" aria-hidden="true">
      {task.status === "error" ? <CircleAlert size={31}/> : active ? <LoaderCircle size={31}/> : task.file.type.startsWith("image/") ? <ImageIcon size={31}/> : <FileText size={31}/>}
    </div>
    <div className="media-upload-card-details">
      <strong title={task.file.name}>{task.file.name}</strong>
      <small>{formatBytes(task.file.size)}</small>
      <MediaUploadStatus task={task}/>
      <MediaUploadActions {...props}/>
    </div>
  </div>;
}

function MediaUploadRow(props: MediaUploadProps) {
  const { task } = props;
  return <tr className={`media-upload-row ${task.status}`}>
    <td><div className="media-file-name">
      <div className="media-preview media-upload-row-preview" aria-hidden="true">{task.file.type.startsWith("image/") ? <ImageIcon size={21}/> : <FileText size={21}/>}</div>
      <div className="media-upload-row-name"><strong title={task.file.name}>{task.file.name}</strong><MediaUploadStatus task={task}/></div>
    </div></td>
    <td>{formatBytes(task.file.size)}</td>
    <td>—</td>
    <td>—</td>
    <td>—</td>
    <td><MediaUploadActions {...props}/></td>
  </tr>;
}

function MediaUsageDialog({ message, usages, onClose }: { message: string; usages: MediaUsage[]; onClose: () => void }) {
  return <div className="modal-layer">
    <button type="button" className="modal-backdrop" aria-label="ปิดรายการการใช้งาน" onClick={onClose}/>
    <div className="media-usage-dialog" role="alertdialog" aria-modal="true" aria-labelledby="media-usage-title">
      <header><span><AlertTriangle size={22}/></span><div><h2 id="media-usage-title">ยังไม่สามารถลบไฟล์นี้ได้</h2><p>{message}</p></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={19}/></button></header>
      <p>นำไฟล์ออกหรือเปลี่ยนเป็นไฟล์อื่นจากรายการต่อไปนี้ก่อน แล้วจึงกลับมาลบอีกครั้ง</p>
      <div className="media-usage-list">
        {usages.map((usage) => <Link key={`${usage.kind}:${usage.id}`} href={usage.href} onClick={onClose}><span><strong>{usage.title}</strong><small>{usage.location}</small></span><ExternalLink size={15}/></Link>)}
      </div>
      <footer><button type="button" className="primary-button" onClick={onClose}>รับทราบ</button></footer>
    </div>
  </div>;
}

function MediaPreview({
  item,
  large = false,
}: {
  item: DemoMediaItem;
  large?: boolean;
}) {
  if (item.kind === "document")
    return (
      <div className={`media-preview document ${large ? "large" : ""}`}>
        <DocumentFileIcon file={item} size={large ? 42 : 28} />
      </div>
    );
  return (
    <div
      className={`media-preview tone-${item.tone} ${item.previewUrl ? "has-image" : ""} ${large ? "large" : ""}`}
      style={
        item.previewUrl
          ? { backgroundImage: `url(${item.previewUrl})` }
          : undefined
      }
    >
      {!item.previewUrl ? <><ImageIcon size={large ? 35 : 24} /><span>{item.name.replace(/\.[^.]+$/, "")}</span></> : null}
    </div>
  );
}

function MediaDrawer({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: DemoMediaItem;
  onClose: () => void;
  onSave: (patch: Pick<DemoMediaItem, "name" | "alt">) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftAlt, setDraftAlt] = useState(item.alt);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
  const savingRef = useRef(false);
  const mediaUrl = item.previewUrl ?? "";

  async function saveChanges() {
    if (savingRef.current) return;
    const name = draftName.trim();
    if (!name) { setSaveError("กรุณากรอกชื่อไฟล์"); return; }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ name, alt: draftAlt.trim() });
      setEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "บันทึกข้อมูลสื่อไม่สำเร็จ");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  const changeZoom = (next: number) => {
    const clamped = Math.min(3, Math.max(1, next));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };

  async function copyMediaUrl() {
    if (!mediaUrl) return;
    await navigator.clipboard.writeText(mediaUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);

  return (
    <>
      <div className="media-drawer-layer">
        <button
          className="media-drawer-backdrop"
          onClick={onClose}
          disabled={saving}
          aria-label="ปิดรายละเอียด"
        />
        <aside className="media-drawer">
        <header>
          <strong>รายละเอียดไฟล์</strong>
          <button onClick={onClose} disabled={saving} aria-label="ปิด">
            <X size={19} />
          </button>
        </header>
        <div className="media-drawer-body">
          {item.kind === "image" && item.previewUrl ? (
            <button
              type="button"
              className="media-preview-open"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setPreviewOpen(true);
              }}
              aria-label={`ดูรูป ${item.name} ขนาดใหญ่`}
            >
              <MediaPreview item={item} large />
              <span className="media-preview-expand"><Maximize size={16} /> ดูรูปใหญ่</span>
            </button>
          ) : (
            <MediaPreview item={item} large />
          )}
          <label>
            <span>ชื่อไฟล์</span>
            {editing ? (
              <input
                value={draftName}
                maxLength={255}
                disabled={saving}
                onChange={(event) => setDraftName(event.target.value)}
              />
            ) : (
              <strong>{item.name}</strong>
            )}
          </label>
          <div className="media-meta">
            <span>
              <small>ขนาด</small>
              <b>
                <HardDrive size={13} />
                {item.size}
              </b>
            </span>
            <span>
              <small>มิติ</small>
              <b>
                <Maximize size={13} />
                {item.dimensions}
              </b>
            </span>
            <span>
              <small>วันที่อัปโหลด</small>
              <b>
                <Calendar size={13} />
                {item.uploadedAt}
              </b>
            </span>
            <span>
              <small>อัปโหลดโดย</small>
              <b>
                <User size={13} />
                {item.uploadedBy}
              </b>
            </span>
          </div>
          {item.kind === "image" ? (
            <label>
              <span>Alt Text</span>
              <input
                value={editing ? draftAlt : item.alt}
                maxLength={500}
                readOnly={!editing}
                disabled={saving}
                onChange={(event) => setDraftAlt(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            <span>URL</span>
            <div className="media-url">
              <input readOnly value={mediaUrl} />
              <button
                type="button"
                className={copied ? "copied" : undefined}
                onClick={() => void copyMediaUrl()}
                aria-label={copied ? "คัดลอก URL แล้ว" : "คัดลอก URL"}
                title={copied ? "คัดลอกแล้ว" : "คัดลอก URL"}
              >
                {copied ? <Check size={16} /> : <Copy size={15} />}
              </button>
              <span className="media-copy-status" role="status" aria-live="polite">{copied ? "คัดลอกแล้ว" : ""}</span>
            </div>
          </label>
          {saveError ? <p className="media-drawer-save-error" role="alert">{saveError}</p> : null}
          <div className="media-drawer-actions">
            {editing ? <>
              <button type="button" onClick={() => void saveChanges()} disabled={saving} aria-busy={saving}>
                {saving ? <LoaderCircle className="media-save-spinner" size={15}/> : <Check size={15}/>}
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button type="button" onClick={() => { setDraftName(item.name); setDraftAlt(item.alt); setSaveError(null); setEditing(false); }} disabled={saving}>ยกเลิก</button>
            </> : <>
              <button type="button" onClick={() => { setDraftName(item.name); setDraftAlt(item.alt); setSaveError(null); setEditing(true); }}>
                <Pencil size={15}/>แก้ไข
              </button>
              <button type="button" className="danger" onClick={onDelete}>
                <Trash2 size={15}/>ลบ
              </button>
            </>}
          </div>
        </div>
        </aside>
      </div>
      {previewOpen && item.previewUrl ? createPortal(
        <div className="gallery-lightbox media-library-lightbox" role="dialog" aria-modal="true" aria-label={`รูป ${item.name}`}>
          <button type="button" className="gallery-lightbox-backdrop" onClick={() => setPreviewOpen(false)} aria-label="ปิดรูปขนาดใหญ่" />
          <div className="media-library-lightbox-stage">
            <button type="button" className="gallery-lightbox-close" onClick={() => setPreviewOpen(false)} aria-label="ปิด"><X size={22} /></button>
            <div
              className={`media-lightbox-viewport ${zoom > 1 ? "can-pan" : ""}`}
              onWheel={(event) => {
                event.preventDefault();
                changeZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
              }}
              onDoubleClick={() => changeZoom(zoom === 1 ? 2 : 1)}
              onPointerDown={(event) => {
                if (zoom <= 1) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragStart.current = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y };
              }}
              onPointerMove={(event) => {
                if (!dragStart.current || zoom <= 1) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const maxX = bounds.width * (zoom - 1) / 2;
                const maxY = bounds.height * (zoom - 1) / 2;
                const x = dragStart.current.x + event.clientX - dragStart.current.clientX;
                const y = dragStart.current.y + event.clientY - dragStart.current.clientY;
                setPan({ x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) });
              }}
              onPointerUp={() => { dragStart.current = null; }}
              onPointerCancel={() => { dragStart.current = null; }}
            >
              <div
                className="gallery-lightbox-image media-lightbox-image"
                style={{ backgroundImage: `url(${item.previewUrl})`, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                role="img"
                aria-label={item.alt || item.name}
              />
            </div>
            <div className="media-lightbox-controls" aria-label="เครื่องมือขยายภาพ">
              <button type="button" onClick={() => changeZoom(zoom - 0.25)} disabled={zoom <= 1} aria-label="ซูมออก"><ZoomOut size={19} /></button>
              <span>{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => changeZoom(zoom + 0.25)} disabled={zoom >= 3} aria-label="ซูมเข้า"><ZoomIn size={19} /></button>
              <button type="button" onClick={() => changeZoom(1)} disabled={zoom === 1} aria-label="คืนขนาดภาพ"><RotateCcw size={18} /></button>
            </div>
          </div>
        </div>, document.body
      ) : null}
    </>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTotalBytes(bytes: number) {
  if (bytes === 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
