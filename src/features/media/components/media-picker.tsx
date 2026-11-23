"use client";

import {
  CircleAlert,
  Check,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  List,
  LoaderCircle,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { DocumentFileIcon } from "./document-file-icon";
import { PdfMediaThumbnail } from "./pdf-media-thumbnail";
import { AdminMediaLoading } from "./admin-media-loading";
import type { DemoMediaItem } from "../demo/media-items";
import {
  addUploadedMediaItem,
  getDemoMediaItem,
  mediaPreviewStyle,
  toDemoMediaItem,
} from "../demo/media-registry";
import { documentFileAccept, isPdfFile, isSupportedDocumentFile } from "../file-behavior";
import { fetchMediaPickerPage, uploadMediaFile } from "../upload-media-file";

type Props = {
  open: boolean;
  currentId: string | null;
  acceptKind?: "image" | "document" | "pdf";
  onClose: () => void;
  onSelect: (item: DemoMediaItem, alt: string) => void;
};

type UploadStatus = "queued" | "uploading" | "saving" | "error" | "canceled";
type UploadTask = {
  id: number;
  file: File;
  status: UploadStatus;
  percent: number | null;
  error: string | null;
  retryable: boolean;
  retrying?: boolean;
  controller: AbortController | null;
};
type PickerEntry = { type: "upload"; task: UploadTask } | { type: "media"; item: DemoMediaItem };
const maxConcurrentUploads = 3;
const maxUploadBytes = 25 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const supportedDocumentTypes = new Set([
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const uploadSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function uploadValidationError(file: File, kind: NonNullable<Props["acceptKind"]>): string | null {
  if (file.size === 0) return "ไฟล์ว่าง ไม่สามารถอัปโหลดได้";
  if (file.size > maxUploadBytes) return "ไฟล์ต้องมีขนาดไม่เกิน 25 MB";
  if (kind === "image" ? !supportedImageTypes.has(file.type)
    : kind === "pdf" ? file.type !== "application/pdf"
    : !isSupportedDocumentFile(file) || !supportedDocumentTypes.has(file.type)) return "ไม่รองรับประเภทไฟล์นี้";
  return null;
}

export function MediaPicker(props: Props) {
  if (!props.open) return null;
  return <OpenMediaPicker {...props} />;
}

type PickerUploadProps = {
  task: UploadTask;
  onCancel: (id: number) => void;
  onRetry: (id: number) => void;
  onDismiss: (id: number) => void;
};

function PickerUploadStatus({ task }: { task: UploadTask }) {
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

function PickerUploadActions({ task, onCancel, onRetry, onDismiss }: PickerUploadProps) {
  return <div className="media-upload-actions">
    {(task.status === "queued" || task.status === "uploading") ?
      <button type="button" onClick={() => onCancel(task.id)} aria-label={`ยกเลิก ${task.file.name}`} title="ยกเลิก"><X size={17}/></button> : null}
    {(task.status === "error" || task.status === "canceled") && task.retryable && !task.controller ?
      <button type="button" onClick={() => onRetry(task.id)} aria-label={`ลองอัปโหลด ${task.file.name} อีกครั้ง`} title="ลองใหม่"><RotateCcw size={16}/></button> : null}
    {(task.status === "error" || task.status === "canceled") && !task.controller ?
      <button type="button" onClick={() => onDismiss(task.id)} aria-label={`นำ ${task.file.name} ออกจากรายการ`} title="นำออกจากรายการ"><X size={17}/></button> : null}
  </div>;
}

function PickerUploadCard(props: PickerUploadProps) {
  const { task } = props;
  const Icon = task.file.type.startsWith("image/") ? ImageIcon : FileText;
  const loading = task.status === "uploading" || task.status === "saving" || (task.retrying && task.status === "queued");
  const failed = task.status === "error";
  return <div className={`media-picker-upload-card ${task.status}`}>
    <div className={`media-picker-upload-placeholder media-upload-preview${failed ? " failed" : ""}`}>
      {loading ? <div className="media-upload-retry-progress" role="status"><LoaderCircle size={28}/><span>กำลังอัปโหลด</span></div> : failed ? <><div className="media-upload-error-visual"><CircleAlert size={28} aria-hidden="true"/><span>{task.error ?? "อัปโหลดไม่สำเร็จ"}</span></div><div className="media-upload-error-actions">{task.retryable && !task.controller ? <button type="button" className="media-upload-retry" onClick={() => props.onRetry(task.id)} aria-label={`ลองอัปโหลด ${task.file.name} อีกครั้ง`} title="ลองใหม่"><RotateCcw size={22}/></button> : null}<button type="button" onClick={() => props.onDismiss(task.id)} aria-label={`นำ ${task.file.name} ออกจากรายการ`} title="นำออกจากรายการ"><X size={24}/></button></div></> : <Icon size={28} aria-hidden="true"/>}
    </div>
    {loading ? <div className="media-picker-upload-details media-picker-upload-details-placeholder" aria-hidden="true"/> : <div className="media-picker-upload-details">
      <b title={task.file.name}>{task.file.name}</b><small>{uploadSize(task.file.size)}</small>
      {failed ? null : <><PickerUploadStatus task={task}/><PickerUploadActions {...props}/></>}
    </div>}
  </div>;
}

function PickerUploadRow(props: PickerUploadProps) {
  const { task } = props;
  const Icon = task.file.type.startsWith("image/") ? ImageIcon : FileText;
  if (task.status === "uploading" || task.status === "saving" || (task.retrying && task.status === "queued")) {
    return <div className="media-picker-upload-row media-picker-upload-row-loading" role="status"><span>กำลังอัปโหลด</span><div className="media-upload-progress indeterminate" aria-hidden="true"><span/></div></div>;
  }
  return <div className={`media-picker-upload-row ${task.status}`}>
    <span className="media-picker-upload-row-icon" aria-hidden="true"><Icon size={20}/></span>
    <div className="media-picker-upload-row-details">
      <b title={task.file.name}>{task.file.name}</b>
      <PickerUploadStatus task={task}/>
    </div>
    <PickerUploadActions {...props}/>
  </div>;
}

function OpenMediaPicker({
  currentId,
  acceptKind = "image",
  onClose,
  onSelect,
}: Props) {
  const isImage = acceptKind === "image";
  const isPdf = acceptKind === "pdf";
  const [items, setItems] = useState<DemoMediaItem[]>([]);
  const [itemsKey, setItemsKey] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [requestError, setRequestError] = useState<{ key: string; message: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(currentId);
  const [selectedItem, setSelectedItem] = useState<DemoMediaItem | null>(() => getDemoMediaItem(currentId));
  const [draggingUpload, setDraggingUpload] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const uploadTasksRef = useRef<UploadTask[]>([]);
  const nextUploadIdRef = useRef(0);
  const mountedRef = useRef(true);
  const queryKey = `${acceptKind}:${debouncedSearch.trim()}`;
  const requestKey = `${queryKey}:${cursor ?? "first"}:${refreshKey}`;
  const loading = loadedRequestKey !== requestKey;
  const loadError = requestError?.key === requestKey ? requestError.message : "";
  const visible = itemsKey === requestKey ? items : [];
  const entries: PickerEntry[] = [
    ...uploadTasks.map((task): PickerEntry => ({ type: "upload", task })),
    ...visible.map((item): PickerEntry => ({ type: "media", item })),
  ];
  const selected = visible.find((item) => item.id === selectedId) ?? selectedItem ?? getDemoMediaItem(selectedId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search); setCursor(null); setPreviousCursors([]); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    void fetchMediaPickerPage({ kind: acceptKind, search: debouncedSearch.trim(), cursor, signal: controller.signal })
      .then((page) => {
        if (controller.signal.aborted) return;
        const additions = page.items.map(toDemoMediaItem);
        setItems(additions);
        setItemsKey(requestKey);
        setNextCursor(page.nextCursor);
        setRequestError(null);
        setLoadedRequestKey(requestKey);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequestError({ key: requestKey, message: "โหลดไฟล์จากคลังสื่อไม่สำเร็จ" });
        setLoadedRequestKey(requestKey);
      });
    return () => controller.abort();
  }, [acceptKind, debouncedSearch, cursor, queryKey, refreshKey, requestKey]);
  useEffect(() => {
    const queue = uploadTasksRef;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queue.current.forEach((task) => task.controller?.abort());
    };
  }, []);

  function publishUploadTasks() {
    if (!mountedRef.current) return;
    setUploadTasks(uploadTasksRef.current.map((task) => ({ ...task })));
  }

  function pumpUploads() {
    if (!mountedRef.current) return;
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
      const item: DemoMediaItem = {
        id: uploaded.id, name: task.file.name, kind: isImage ? "image" : "document",
        mimeType: task.file.type, size: `${Math.max(1, Math.round(task.file.size / 1024))} KB`,
        sizeBytes: task.file.size, dimensions: isImage ? "รูปภาพ" : "—",
        uploadedAt: "วันนี้", uploadedBy: "ผู้ดูแลระบบ",
        alt: task.file.name.replace(/\.[^.]+$/, ""), previewUrl: uploaded.url,
        tone: (task.id % 5) + 1,
      };
      addUploadedMediaItem(item);
      setSelectedId(item.id);
      setSelectedItem(item);
      uploadTasksRef.current = uploadTasksRef.current.filter((entry) => entry.id !== task.id);
      setCursor(null);
      setPreviousCursors([]);
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
      const error = uploadValidationError(file, acceptKind);
      return { id: ++nextUploadIdRef.current, file, status: error ? "error" : "queued",
        percent: 0, error, retryable: !error, controller: null };
    });
    if (!additions.length) return;
    uploadTasksRef.current.push(...additions);
    setSearch("");
    setDebouncedSearch("");
    setCursor(null);
    setPreviousCursors([]);
    contentRef.current?.scrollTo({ top: 0 });
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
    task.retrying = true;
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

  function choose(item: DemoMediaItem) {
    setSelectedId(item.id);
    setSelectedItem(item);
  }

  const PreviewIcon = isImage ? ImageIcon : FileText;
  return (
    <div className="media-picker-layer">
      <button
        className="media-picker-backdrop"
        onClick={onClose}
        aria-label="ปิด"
      />
      <section
        className="media-picker"
        role="dialog"
        aria-modal="true"
        aria-label="เลือกสื่อจากคลังสื่อ"
      >
        <header>
          <strong>
            เลือก{isImage ? "รูปภาพ" : isPdf ? "ไฟล์ PDF" : "เอกสาร"}จากคลังสื่อ
          </strong>
          <button onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </header>
        <div ref={contentRef} className="media-picker-content">
        <div className="media-picker-tools">
          <input
            ref={inputRef}
            type="file"
            accept={
              isImage
                ? ".jpg,.jpeg,.png,.webp,.gif"
                : isPdf
                  ? "application/pdf,.pdf"
                  : documentFileAccept
            }
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            className={`media-picker-upload ${draggingUpload ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDraggingUpload(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDraggingUpload(true);
            }}
            onDragLeave={(event: DragEvent<HTMLButtonElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDraggingUpload(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDraggingUpload(false);
              if (event.dataTransfer.files.length) {
                addFiles(event.dataTransfer.files);
              }
            }}
          >
            <span className="media-picker-upload-icon">
              <Upload size={19} />
            </span>
            <span>
              <strong>ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</strong>
              <small>
                {isImage
                  ? "รองรับ JPEG, PNG, WebP และ GIF"
                  : isPdf
                    ? "รองรับไฟล์ PDF"
                    : "รองรับ PDF, Word, PowerPoint และ Excel"}
              </small>
            </span>
          </button>
          <div className="media-picker-toolbar">
            <label>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาไฟล์..."
              />
            </label>
            <div className="media-picker-filter">
              <button className="active">
                {isImage ? "รูปภาพ" : isPdf ? "PDF" : "เอกสาร"}
              </button>
            </div>
            <div className="media-picker-view">
              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
                aria-label="มุมมองตาราง"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="มุมมองรายการ"
              >
                <List size={17} />
              </button>
            </div>
          </div>
          <p className="media-picker-count" aria-live="polite">
            {loadError
              ? "โหลดรายการไฟล์ไม่สำเร็จ"
              : loading
              ? "กำลังโหลดรายการไฟล์..."
              : `หน้า ${previousCursors.length + 1} · ${visible.length} รายการ${uploadTasks.length ? ` · กำลังจัดการ ${uploadTasks.length} ไฟล์` : ""}`}
          </p>
        </div>
        <div className="media-picker-file-list">
          {loadError && entries.length === 0 ? (
            <div className="media-picker-empty" role="alert">{loadError} <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></div>
          ) : loading && entries.length === 0 ? (
            <AdminMediaLoading view={view} picker />
          ) : entries.length === 0 ? (
            <p className="media-picker-empty">ไม่พบไฟล์ที่ค้นหา</p>
          ) : view === "grid" ? (
            <div className="media-picker-grid">
              {entries.map((entry) => {
                if (entry.type === "upload") return <PickerUploadCard key={`upload:${entry.task.id}`} task={entry.task} onCancel={cancelUpload} onRetry={retryUpload} onDismiss={dismissUpload}/>;
                const item = entry.item;
                return (
                <button
                  key={item.id}
                  className={selectedId === item.id ? "selected" : ""}
                  onClick={() => choose(item)}
                  title={item.name}
                >
                  <span
                    className={`media-picker-thumb ${item.kind === "document" ? "document" : ""}`}
                    style={item.kind === "image" ? mediaPreviewStyle(item) : undefined}
                  >
                    {item.kind === "document" && item.previewUrl && isPdfFile(item) ? (
                      <PdfMediaThumbnail url={item.previewUrl} name={item.name} cover />
                    ) : item.kind === "document" ? (
                      <DocumentFileIcon file={item} size={28} />
                    ) : (
                      <PreviewIcon size={23} />
                    )}
                    {selectedId === item.id ? (
                      <i>
                        <Check size={12} />
                      </i>
                    ) : null}
                  </span>
                  <div className="media-picker-upload-details">
                    <b title={item.name}>{item.name}</b>
                    <small>{item.size}</small>
                  </div>
                </button>
                );
              })}
            </div>
          ) : (
            <div className="media-picker-list">
              {entries.map((entry) => {
                if (entry.type === "upload") return <PickerUploadRow key={`upload:${entry.task.id}`} task={entry.task} onCancel={cancelUpload} onRetry={retryUpload} onDismiss={dismissUpload}/>;
                const item = entry.item;
                return (
                <button
                  key={item.id}
                  className={selectedId === item.id ? "selected" : ""}
                  onClick={() => choose(item)}
                  title={item.name}
                >
                  <span
                    className={`media-picker-thumb ${item.kind === "document" ? "document" : ""}`}
                    style={item.kind === "image" ? mediaPreviewStyle(item) : undefined}
                  >
                    {item.kind === "document" && item.previewUrl && isPdfFile(item) ? (
                      <PdfMediaThumbnail url={item.previewUrl} name={item.name} cover />
                    ) : item.kind === "document" ? (
                      <DocumentFileIcon file={item} size={20} />
                    ) : (
                      <PreviewIcon size={18} />
                    )}
                  </span>
                  <b>{item.name}</b>
                  <small>{item.size}</small>
                  {selectedId === item.id ? <Check size={15} /> : null}
                </button>
                );
              })}
            </div>
          )}
        </div>
        {(previousCursors.length > 0 || nextCursor) ? (
          <nav className="media-picker-pagination" aria-label="หน้ารายการไฟล์">
            <button type="button" disabled={loading || previousCursors.length === 0} onClick={() => {
              const previous = previousCursors.at(-1) ?? null;
              setPreviousCursors((current) => current.slice(0, -1));
              setCursor(previous);
              contentRef.current?.scrollTo({ top: 0 });
            }}>ก่อนหน้า</button>
            <span>หน้า {previousCursors.length + 1}</span>
            <button type="button" disabled={loading || !nextCursor} onClick={() => {
              if (!nextCursor) return;
              setPreviousCursors((current) => [...current, cursor]);
              setCursor(nextCursor);
              contentRef.current?.scrollTo({ top: 0 });
            }}>ถัดไป</button>
          </nav>
        ) : null}
        </div>
        <footer>
          {selected ? (
            <>
              <div className="media-picker-selection" aria-label="ไฟล์ที่เลือก">
                {selected.kind === "document" ? (
                  <DocumentFileIcon file={selected} size={20} />
                ) : (
                  <span className="media-picker-selected" style={mediaPreviewStyle(selected)}>
                    <PreviewIcon size={18} />
                  </span>
                )}
                <strong className="media-picker-selection-name" title={selected.name}>{selected.name}</strong>
                <small className="media-picker-selection-size">{selected.size}{selected.dimensions !== "—" ? ` · ${selected.dimensions}` : ""}</small>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  addUploadedMediaItem(selected);
                  onSelect(selected, selected.name.replace(/\.[^.]+$/, ""));
                }}
              >
                ใช้สื่อนี้
              </button>
            </>
          ) : (
            <p>เลือกไฟล์จากคลังสื่อเพื่อใช้ซ้ำ — ไม่ต้องอัปโหลดไฟล์เดิมซ้ำ</p>
          )}
        </footer>
      </section>
    </div>
  );
}
