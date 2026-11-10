"use client";

import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { NativeSelect } from "@/components/ui/native-select";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Copy,
  Eye,
  EyeOff,
  FileSearch,
  FilePenLine,
  GalleryHorizontal,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  ListChecks,
  Layers,
  MapPinned,
  Milestone,
  Plus,
  Megaphone,
  Minus,
  Settings2,
  Paperclip,
  PanelsTopLeft,
  Quote,
  Save,
  Search,
  Send,
  Table2,
  Trash2,
  Type,
  Video,
  X,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { showGlobalToast } from "@/components/ui/global-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MediaPicker } from "@/features/media/components/media-picker";
import { useMediaRevision } from "@/features/media/use-media-revision";
import {
  getDemoMediaItem,
} from "@/features/media/demo/media-registry";
import type { DemoPost } from "@/features/pages/demo/data";
import { createBlock, type BuilderBlock } from "@/features/pages/demo/model";
import { BlockSettings } from "@/features/pages/components/home-builder";
import { RichTextEditor } from "@/features/pages/blocks/editors/rich-text-editor-client";
import { TableCanvasEditor } from "@/features/pages/blocks/editors/table-canvas-editor";
import type { ArticleBlock as SharedArticleBlock } from "@/features/pages/blocks/config/types";
import { BlockRenderer, blockContainerClassName } from "@/features/pages/blocks/renderers/block-renderer";
import type { DemoUnit } from "@/features/units/demo/model";
import { readUnits, refreshUnits } from "@/features/units/demo/storage";
import { actOnPost, savePost } from "../demo/storage";
import { CategorySelect } from "@/features/categories/components/category-select";
import { categoriesChangedEvent, categoryName, readCategories } from "@/features/categories/demo/storage";
import { NewsCoverEditor } from "./news-cover-editor";

type ArticleKind =
  | "heading"
  | "text"
  | "cardText"
  | "image"
  | "cta"
  | "gallery"
  | "quote"
  | "alert"
  | "video"
  | "pdfViewer"
  | "downloads"
  | "documentList"
  | "schedule"
  | "table"
  | "processSteps"
  | "map"
  | "timeline"
  | "divider";
type ArticleBlock = Extract<SharedArticleBlock, { type: ArticleKind }>;
const removableListLabels: Record<string, string> = {
  slides: "สไลด์",
  images: "รูปภาพ",
  files: "ไฟล์แนบ",
  items: "รายการ",
  groups: "หมวด",
  tabs: "แท็บ",
};

function removedListLabel(before: unknown, after: unknown): string | null {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return null;
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  for (const [key, label] of Object.entries(removableListLabels)) {
    if (Array.isArray(previous[key]) && Array.isArray(next[key]) && next[key].length < previous[key].length) return label;
  }
  for (const [key, value] of Object.entries(previous)) {
    const nextValue = next[key];
    if (Array.isArray(value) && Array.isArray(nextValue) && value.length === nextValue.length) {
      for (const item of value) {
        if (!item || typeof item !== "object") continue;
        const id = (item as { id?: unknown }).id;
        const matchingItem = nextValue.find((candidate) => candidate && typeof candidate === "object" && (candidate as { id?: unknown }).id === id);
        if (matchingItem) {
          const nestedLabel = removedListLabel(item, matchingItem);
          if (nestedLabel) return nestedLabel;
        }
      }
    }
  }
  return null;
}
const articleKinds: Array<{
  type: ArticleKind;
  label: string;
  icon: typeof Type;
}> = [
  { type: "heading", label: "หัวข้อ", icon: Heading2 },
  { type: "text", label: "Rich Text", icon: Type },
  { type: "cardText", label: "การ์ดข้อความ", icon: PanelsTopLeft },
  { type: "image", label: "รูปภาพ", icon: ImageIcon },
  { type: "cta", label: "ปุ่มและลิงก์", icon: Plus },
  { type: "gallery", label: "แกลเลอรี", icon: GalleryHorizontal },
  { type: "quote", label: "คำพูดเน้น", icon: Quote },
  { type: "alert", label: "กล่องประกาศ", icon: Megaphone },
  { type: "video", label: "วิดีโอ", icon: Video },
  { type: "pdfViewer", label: "PDF Viewer", icon: FileSearch },
  { type: "downloads", label: "ไฟล์แนบ", icon: Paperclip },
  { type: "documentList", label: "รายการเอกสาร", icon: FileSearch },
  { type: "schedule", label: "วันเวลาและสถานที่", icon: CalendarDays },
  { type: "table", label: "ตาราง", icon: Table2 },
  { type: "processSteps", label: "ขั้นตอนการรับบริการ", icon: ListChecks },
  { type: "map", label: "แผนที่", icon: MapPinned },
  { type: "timeline", label: "Timeline", icon: Milestone },
  { type: "divider", label: "เส้นคั่น", icon: Minus },
];
// Existing blocks stay supported; only the insert menu is simplified.
const richTextToolKinds = new Set<ArticleKind>(["heading", "image", "quote", "table", "divider"]);
const hiddenInsertKinds = new Set<ArticleKind>(["cardText", "schedule", "processSteps", "map", "timeline"]);
const insertableArticleKinds = articleKinds.filter((item) => !richTextToolKinds.has(item.type) && !hiddenInsertKinds.has(item.type));
const hydrate = () => () => undefined;
function createArticleBlock(type: ArticleKind, id: string): ArticleBlock {
  return createBlock(type, id) as ArticleBlock;
}
function emptyPost(): DemoPost {
  return {
    id: "new-post",
    title: "",
    excerpt: "",
    slug: "",
    unitId: null,
    owner: "โรงพยาบาล",
    categoryId: readCategories("posts").find((category) => category.active)?.id ?? "",
    status: "draft",
    publishedAt: null,
    updatedAt: "เมื่อสักครู่",
    coverMediaId: null,
    coverFit: "cover",
    coverFocus: { x: 50, y: 50 },
    coverZoom: 100,
    showCoverInContent: false,
    blocks: [
      createBlock("text", "new-post-intro") as Extract<
        SharedArticleBlock,
        { type: "text" }
      >,
    ],
  };
}

function NewsBlockLayers({ blocks, selectedId, draftLabels, onSelect, onReorder, onClose }: {
  blocks: ArticleBlock[];
  selectedId: string | null;
  draftLabels: Map<string, string>;
  onSelect: (id: string) => void;
  onReorder: (result: DropResult) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="news-block-layers" aria-labelledby="news-block-layers-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="news-block-layers-panel">
      <header><div><Layers size={19}/><h2 id="news-block-layers-title">บล็อกทั้งหมด</h2><span>{blocks.length}</span></div><button type="button" onClick={onClose} aria-label="ปิดบล็อกทั้งหมด"><X size={19}/></button></header>
      <p>ลากเพื่อจัดลำดับ · กดรายการเพื่อไปยังบล็อก</p>
      <DragDropContext onDragEnd={onReorder}>
        <Droppable droppableId="news-block-layers" type="article-layer">
          {(drop) => <div className="news-block-layers-list" ref={drop.innerRef} {...drop.droppableProps}>
            {blocks.map((block, index) => {
              const kind = articleKinds.find((item) => item.type === block.type);
              const Icon = kind?.icon ?? Type;
              const title = "title" in block.config && typeof block.config.title === "string" ? block.config.title.trim() : "";
              return <Draggable key={block.id} draggableId={`layer-${block.id}`} index={index}>
                {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`news-block-layer${selectedId === block.id ? " selected" : ""}${snapshot.isDragging ? " dragging" : ""}`}>
                  <span className="news-block-layer-handle" {...drag.dragHandleProps} aria-label={`ลากบล็อกที่ ${index + 1}: ${title || kind?.label}`}><GripVertical size={17}/></span>
                  <button type="button" onClick={() => onSelect(block.id)} aria-current={selectedId === block.id ? "true" : undefined}>
                    <span className="news-block-layer-icon"><Icon size={19}/></span>
                    <span className="news-block-layer-copy"><strong>{title || kind?.label || "บล็อก"}</strong><small>{index + 1} · {kind?.label}{block.visibility === "hidden" ? " · ซ่อนอยู่" : ""}{draftLabels.has(block.id) ? ` · ${draftLabels.get(block.id)}` : ""}</small></span>
                    {block.visibility === "hidden" ? <EyeOff size={15} aria-label="ซ่อนอยู่"/> : null}
                  </button>
                </div>}
              </Draggable>;
            })}
            {drop.placeholder}
            {!blocks.length ? <p className="news-block-layers-empty">ยังไม่มีบล็อกในข่าวนี้</p> : null}
          </div>}
        </Droppable>
      </DragDropContext>
      <footer>การเปลี่ยนลำดับจะบันทึกพร้อมข่าว</footer>
    </div>
  </dialog>;
}

export function NewsEditor({ postId }: { postId: string | null }) {
  const router = useRouter();
  useMediaRevision();
  const [ownerUnits, setOwnerUnits] = useState<DemoUnit[]>(() => readUnits(true));
  useEffect(() => { void refreshUnits(true).then(setOwnerUnits).catch(() => undefined); }, []);
  const ready = useSyncExternalStore(
    hydrate,
    () => true,
    () => false,
  );
  const [post, setPost] = useState<DemoPost>(() => emptyPost());
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(post),
  );
  const [coverPicker, setCoverPicker] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingItemRemoval, setPendingItemRemoval] = useState<{ block: ArticleBlock; label: string } | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile" | null>(null);
  const [loadingPost, setLoadingPost] = useState(Boolean(postId));
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const hasChanges = JSON.stringify(post) !== savedSnapshot;
  const shouldWarnOnLeave = ready && !loadingPost && !loadError && (hasChanges || post.id === "new-post");
  useEffect(() => {
    if (!shouldWarnOnLeave) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptLink = (event: MouseEvent) => {
      if (allowLeaveRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.getAttribute("target") && anchor.getAttribute("target") !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
      if (destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeaveHref(destination.href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [shouldWarnOnLeave]);
  useEffect(() => {
    if (!metaOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !coverPicker) setMetaOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [metaOpen, coverPicker]);
  const setToast = showGlobalToast;
  useEffect(() => {
    if (!postId) {
      const timer = window.setTimeout(() => {
        const blank = emptyPost();
        setPost(blank);
        setSavedSnapshot(JSON.stringify(blank));
        setLoadingPost(false);
        setLoadError("");
        setCoverPicker(false);
        setMetaOpen(false);
        setInsertAt(null);
        setSelectedBlockId(null);
        setSettingsBlockId(null);
        setPendingDeleteId(null);
        setConfirmPublish(false);
        setPreviewMode(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    void fetch(`/api/posts/${postId}`, { cache: "no-store" }).then(async (response) => {
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "โหลดข่าวไม่สำเร็จ");
      return payload as DemoPost;
    }).then((saved) => {
      if (!active) return;
      setPost(saved); setSavedSnapshot(JSON.stringify(saved));
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "โหลดข่าวไม่สำเร็จ");
    }).finally(() => { if (active) setLoadingPost(false); });
    return () => { active = false; };
  }, [postId]);
  useEffect(() => {
    if (postId) return;
    const chooseFirstCategory = () => {
      const first = readCategories("posts").find((item) => item.active);
      if (first) setPost((current) => current.categoryId ? current : { ...current, categoryId: first.id });
    };
    chooseFirstCategory();
    window.addEventListener(categoriesChangedEvent, chooseFirstCategory);
    return () => window.removeEventListener(categoriesChangedEvent, chooseFirstCategory);
  }, [postId]);
  if (!ready || loadingPost) return <AdminContentLoading/>;
  if (loadError) return <div className="news-editor"><p role="alert">{loadError}</p><Link href="/admin/posts">กลับไปหน้าข่าว</Link></div>;
  const blocks = post.blocks.filter((block): block is ArticleBlock =>
    articleKinds.some((item) => item.type === block.type),
  );
  const settingsBlock = blocks.find((block) => block.id === settingsBlockId);
  const savedPost = JSON.parse(savedSnapshot) as DemoPost;
  const draftLabels = new Map<string, string>();
  const publishedBlocks = post.publishedBlocks ?? [];
  const savedBlocks = savedPost.blocks ?? [];
  for (const [index, block] of blocks.entries()) {
    const publishedIndex = publishedBlocks.findIndex((item) => item.id === block.id);
    const savedBlock = savedBlocks.find((item) => item.id === block.id);
    if (post.status === "draft" || publishedIndex < 0) draftLabels.set(block.id, savedBlock && JSON.stringify(savedBlock) === JSON.stringify(block) ? "บันทึกร่างแล้ว" : "ยังไม่บันทึก");
    else if (publishedIndex !== index || JSON.stringify(publishedBlocks[publishedIndex]) !== JSON.stringify(block))
      draftLabels.set(block.id, savedBlock && JSON.stringify(savedBlock) === JSON.stringify(block) ? "ร่างที่ยังไม่เผยแพร่" : "ยังไม่บันทึก");
  }
  const saveStatus = hasChanges || post.id === "new-post" ? "unsaved" : post.status === "draft" || post.hasUnpublishedChanges ? "draft" : "published";
  const saveStatusLabel = saveStatus === "unsaved"
    ? post.id === "new-post" && !hasChanges ? "ข่าวนี้ยังไม่ได้บันทึก" : "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก"
    : saveStatus === "draft"
      ? post.status === "published" ? "บันทึกการเปลี่ยนแปลงแล้ว รอเผยแพร่ หน้าเว็บไซต์ยังแสดงเวอร์ชันเดิม" : "บันทึกเป็นฉบับร่างแล้ว ยังไม่แสดงบนเว็บไซต์"
      : "เผยแพร่เวอร์ชันล่าสุดแล้ว";
  const cover = getDemoMediaItem(post.coverMediaId);
  const category = categoryName(readCategories("posts"), post.categoryId);
  const ownerName = ownerUnits.find((unit) => unit.id === post.unitId)?.name ?? "โรงพยาบาล";
  function patch(value: Partial<DemoPost>) {
    setPost((current) => ({ ...current, ...value, updatedAt: "เมื่อสักครู่" }));
  }
  function updateBlock(next: ArticleBlock) {
    patch({
      blocks: blocks.map((block) => (block.id === next.id ? next : block)),
    });
  }
  function addBlock(type: ArticleKind, index = blocks.length) {
    const block = createArticleBlock(type, crypto.randomUUID());
    patch({
      blocks: [...blocks.slice(0, index), block, ...blocks.slice(index)],
    });
    setSelectedBlockId(block.id);
    setInsertAt(null);
  }
  function duplicateBlock(id: string) {
    const index = blocks.findIndex((block) => block.id === id);
    const source = blocks[index];
    if (!source) return;
    const copy = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
    } as ArticleBlock;
    patch({
      blocks: [
        ...blocks.slice(0, index + 1),
        copy,
        ...blocks.slice(index + 1),
      ],
    });
    setSelectedBlockId(copy.id);
  }
  function toggleBlockVisibility(id: string) {
    patch({
      blocks: blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              visibility:
                block.visibility === "visible" ? "hidden" : "visible",
            }
          : block,
      ),
    });
  }
  function reorder(result: DropResult) {
    setInsertAt(null);
    if (!result.destination) return;
    if (result.type === "document-list-item") {
      if (result.destination.droppableId !== result.source.droppableId) return;
      const blockId = result.source.droppableId.replace("document-list-items-", "");
      const block = blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "documentList") return;
      const items = [...block.config.items];
      const [moved] = items.splice(result.source.index, 1);
      if (!moved) return;
      items.splice(result.destination.index, 0, moved);
      patch({ blocks: blocks.map((item) => item.id === blockId ? { ...block, config: { ...block.config, items } } : item) });
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(result.source.index, 1);
    if (!moved) return;
    next.splice(result.destination.index, 0, moved);
    patch({ blocks: next });
  }
  async function persist(publish: boolean) {
    if (saving) return;
    if (!readCategories("posts").some((item) => item.id === post.categoryId && item.active)) {
      setMetaOpen(true);
      setToast({ id: crypto.randomUUID(), title: "บันทึกไม่สำเร็จ", description: "กรุณาเพิ่มและเลือกหมวดหมู่ข่าวก่อน", variant: "error" });
      return;
    }
    const isNewPost = post.id === "new-post";
    const id = post.id;
    const unit = ownerUnits.find((item) => item.id === post.unitId);
    const next: DemoPost = {
      ...post,
      id,
      title: post.title || "ข่าวใหม่",
      excerpt: "",
      slug: post.slug,
      showCoverInContent: false,
      owner: unit?.name ?? "โรงพยาบาล",
      status: post.status,
      publishedAt: publish
        ? (post.publishedAt ??
          new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
            new Date(),
          ))
        : post.publishedAt,
      updatedAt: "เมื่อสักครู่",
      blocks,
    };
    setSaving(true);
    try {
      const saved = await savePost(next, publish);
      setPost(saved);
      setSavedSnapshot(JSON.stringify(saved));
      setToast({ id: crypto.randomUUID(), title: publish ? "เผยแพร่ข่าวแล้ว" : "บันทึกร่างข่าวแล้ว", description: publish ? `“${saved.title}” แสดงบนเว็บไซต์เรียบร้อยแล้ว` : saved.status === "published" ? `บันทึกการแก้ไข “${saved.title}” แล้ว หน้าเว็บไซต์ยังแสดงเวอร์ชันเดิม` : `บันทึก “${saved.title}” เป็นฉบับร่างเรียบร้อยแล้ว`, variant: "success" });
      if (isNewPost) {
        window.history.replaceState(null, "", `/admin/posts/${saved.id}/edit`);
      }
    } catch (error) {
      setToast({ id: crypto.randomUUID(), title: publish ? "เผยแพร่ไม่สำเร็จ" : "บันทึกไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setSaving(false);
    }
  }
  async function discardDraft() {
    if (saving || post.status !== "published" || !post.hasUnpublishedChanges) return;
    setSaving(true);
    try {
      const restored = await actOnPost(post, "discardDraft");
      if (!restored) throw new Error("คืนค่าร่างไม่สำเร็จ");
      setPost(restored);
      setSavedSnapshot(JSON.stringify(restored));
      setSelectedBlockId(null);
      setSettingsBlockId(null);
      setConfirmDiscardDraft(false);
      setToast({ id: crypto.randomUUID(), title: "ทิ้งร่างแล้ว", description: "กลับไปใช้ฉบับที่เผยแพร่อยู่ เว็บไซต์ไม่เปลี่ยนแปลง", variant: "success" });
    } catch (error) {
      setToast({ id: crypto.randomUUID(), title: "ทิ้งร่างไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    } finally { setSaving(false); }
  }
  return (
    <div className="news-editor has-toolbar">
      <header className="news-editor-heading">
        <div>
          <Link href="/admin/posts">
            <ArrowLeft size={16} />
            กลับ
          </Link>
          <h1>{postId || post.id !== "new-post" ? "แก้ไขข่าว" : "สร้างข่าว"}</h1>
          <p>ข้อมูลข่าวและเนื้อหาแบบ Block</p>
        </div>
      </header>
      <section className="news-meta-card">
        <label className="news-title-input">
          <span>ชื่อข่าว</span>
          <input
            value={post.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="ระบุชื่อข่าวหรือผลงาน"
          />
        </label>
        <button type="button" className="news-meta-trigger" onClick={() => setMetaOpen(true)}>
          <Settings2 size={17} aria-hidden="true" />
          <strong>ข้อมูลข่าว</strong>
          <span>{category || "ยังไม่เลือกหมวดหมู่"} · {ownerName} · {cover ? "มีรูปปกการ์ด" : "ยังไม่มีรูปปก"}</span>
        </button>
      </section>
      <section className="article-builder article-builder-full">
        <main>
          <DragDropContext onDragEnd={reorder}>
            <Droppable droppableId="article-blocks">
              {(drop) => (
                <div
                  className="article-block-list"
                  ref={drop.innerRef}
                  {...drop.droppableProps}
                >
                  {blocks.map((block, index) => (
                    <Fragment key={block.id}>
                      <ArticleInsertLine
                        index={index}
                        active={insertAt === index}
                        onOpen={() =>
                          setInsertAt(insertAt === index ? null : index)
                        }
                      />
                      <Draggable draggableId={block.id} index={index}>
                        {(drag, snapshot) => (
                          <article
                            id={`news-block-${block.id}`}
                            tabIndex={-1}
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className={`${snapshot.isDragging ? "dragging " : ""}${selectedBlockId === block.id ? "selected " : ""}${block.visibility === "hidden" ? "hidden-block" : ""}`}
                            onPointerDown={() => setSelectedBlockId(block.id)}
                          >
                            <div className="article-block-actions" aria-label={`เครื่องมือ ${articleKinds.find((item) => item.type === block.type)?.label ?? "Block"}`}>
                              <span {...drag.dragHandleProps}>
                                <GripVertical size={16} />
                              </span>
                              <button type="button" onClick={() => setSettingsBlockId(block.id)} aria-label={`ตั้งค่า ${articleKinds.find((item) => item.type === block.type)?.label ?? "Block"}`} title="ตั้งค่า Block"><Settings2 size={14} /></button>
                              <button
                                type="button"
                                onClick={() => duplicateBlock(block.id)}
                                aria-label="ทำสำเนา Block"
                                title="ทำสำเนา"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBlockVisibility(block.id)}
                                aria-label={
                                  block.visibility === "visible"
                                    ? "ซ่อน Block"
                                    : "แสดง Block"
                                }
                                title={
                                  block.visibility === "visible"
                                    ? "ซ่อน Block"
                                    : "แสดง Block"
                                }
                              >
                                {block.visibility === "visible" ? (
                                  <EyeOff size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => setPendingDeleteId(block.id)}
                                aria-label={`ลบ ${articleKinds.find((item) => item.type === block.type)?.label ?? "Block"}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            {draftLabels.has(block.id) ? <span className="news-block-draft-label"><FilePenLine size={13}/>{draftLabels.get(block.id)}</span> : null}
                            <div className={`article-block-preview${block.type === "text" || block.type === "cardText" ? " inline-rich-text" : block.type === "downloads" ? " inline-attachment" : block.type === "documentList" ? " inline-document-list" : block.type === "cta" ? " inline-cta" : block.type === "gallery" ? " inline-gallery" : block.type === "video" ? " inline-video" : block.type === "alert" ? " inline-alert" : block.type === "pdfViewer" ? " inline-pdf-viewer" : ""}`}>
                              {block.type === "text" || block.type === "cardText" ? (
                                <section className={blockContainerClassName(block)}>
                                  <RichTextEditor
                                    key={block.id}
                                    value={block.config.content}
                                    onChange={(content) => {
                                      if (block.type === "cardText") updateBlock({ ...block, config: { ...block.config, content } });
                                      else updateBlock({ ...block, config: { content } });
                                    }}
                                  />
                                </section>
                              ) : block.type === "table" ? (
                                <section className={blockContainerClassName(block)}>
                                  <TableCanvasEditor config={block.config} onChange={(config) => updateBlock({ ...block, config })} />
                                </section>
                              ) : (
                                <BlockRenderer blocks={[block]} adminPreview pdfPositionOnly />
                              )}
                            </div>
                          </article>
                        )}
                      </Draggable>
                    </Fragment>
                  ))}
                  {drop.placeholder}
                  {blocks.length ? (
                    <ArticleInsertLine
                      index={blocks.length}
                      active={insertAt === blocks.length}
                      onOpen={() =>
                        setInsertAt(
                          insertAt === blocks.length ? null : blocks.length,
                        )
                      }
                    />
                  ) : null}
                  {blocks.length === 0 ? (
                    <div
                      className="article-empty"
                      onClick={() => setInsertAt(0)}
                    >
                      <button type="button" aria-label="เพิ่มเนื้อหาแรก">
                        <Plus size={18} />
                      </button>
                      <strong>เพิ่มข้อความเพื่อเริ่มเขียนข่าว</strong>
                    </div>
                  ) : null}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </main>
      </section>
      {layersOpen ? <NewsBlockLayers blocks={blocks} selectedId={selectedBlockId} draftLabels={draftLabels} onReorder={reorder} onClose={() => setLayersOpen(false)} onSelect={(id) => {
        setSelectedBlockId(id);
        setLayersOpen(false);
        requestAnimationFrame(() => {
          const element = document.getElementById(`news-block-${id}`);
          element?.focus({ preventScroll: true });
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }}/> : null}
      {settingsBlock ? <DragDropContext onDragEnd={reorder}><BlockSettings
        block={settingsBlock as BuilderBlock}
        onChange={(next) => {
          const label = removedListLabel(settingsBlock.config, next.config);
          if (label) setPendingItemRemoval({ block: next as ArticleBlock, label });
          else updateBlock(next as ArticleBlock);
        }}
        onClose={() => setSettingsBlockId(null)}
        inlineTextEditing={settingsBlock.type === "text" || settingsBlock.type === "cardText"}
        hideThemeControls
        hidePdfAlignment
      /></DragDropContext> : null}
      {previewMode ? (
        <NewsArticlePreview
          post={post}
          owner={ownerUnits.find((unit) => unit.id === post.unitId)?.name ?? "โรงพยาบาล"}
          mode={previewMode}
          onModeChange={setPreviewMode}
          onClose={() => setPreviewMode(null)}
        />
      ) : null}
      <div className="news-editor-toolbar" role="toolbar" aria-label="เครื่องมือจัดการข่าว">
        <div className="news-editor-toolbar-tools">
          <button type="button" aria-haspopup="dialog" aria-label={`บล็อกทั้งหมด ${blocks.length} บล็อก`} onClick={() => setLayersOpen(true)}><Layers size={17}/><span className="news-toolbar-label">บล็อกทั้งหมด</span> <span className="news-editor-toolbar-count">{blocks.length}</span></button>
          <button type="button" aria-label="ดูตัวอย่าง" onClick={() => setPreviewMode("desktop")}><Eye size={17}/><span className="news-toolbar-label">ดูตัวอย่าง</span></button>
        </div>
        <div className="news-editor-toolbar-actions">
          {post.status === "published" && post.hasUnpublishedChanges ? <button type="button" className="news-discard-draft" aria-label="ทิ้งร่าง" disabled={saving} onClick={() => setConfirmDiscardDraft(true)}><Trash2 size={16}/><span className="news-toolbar-label">ทิ้งร่าง</span></button> : null}
          <details className={`news-editor-toolbar-status is-${saveStatus}`}>
            <summary aria-label={saveStatusLabel}>
              {saveStatus === "unsaved" ? <CircleAlert size={18} aria-hidden="true" /> : saveStatus === "draft" ? <FilePenLine size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            </summary>
            <span className="news-editor-toolbar-tooltip" role="tooltip">{saveStatusLabel}</span>
          </details>
          <button type="button" aria-label="บันทึก" disabled={saving || !hasChanges} onClick={() => setConfirmSave(true)}><Save size={16}/><span className="news-toolbar-label">บันทึก</span></button>
            <button
              type="button"
              className="primary-button"
              aria-label={post.status === "published" ? "เผยแพร่การเปลี่ยนแปลง" : "เผยแพร่"}
              disabled={saving || (post.status === "published" && !hasChanges && !post.hasUnpublishedChanges)}
              onClick={() => setConfirmPublish(true)}
            >
              <Send size={15} />
              <span className="news-toolbar-publish-desktop">{post.status === "published" ? "เผยแพร่การเปลี่ยนแปลง" : "เผยแพร่"}</span>
              <span className="news-toolbar-publish-mobile">เผยแพร่</span>
            </button>
        </div>
      </div>
      {insertAt !== null ? (
        <ArticleInsertModal
          onClose={() => setInsertAt(null)}
          onPick={(type) => addBlock(type, insertAt)}
        />
      ) : null}
      {metaOpen ? (
        <div className="builder-modal-layer news-meta-modal-layer">
          <button type="button" className="builder-modal-backdrop" onClick={() => setMetaOpen(false)} aria-label="ปิดข้อมูลข่าว" />
          <section className="news-meta-modal" role="dialog" aria-modal="true" aria-labelledby="news-meta-modal-title">
            <header>
              <div><strong id="news-meta-modal-title">ข้อมูลข่าว</strong><small>ตั้งค่าหมวดหมู่ เจ้าของเนื้อหา และรูปปกการ์ดข่าว</small></div>
              <button type="button" onClick={() => setMetaOpen(false)} aria-label="ปิด"><X size={20} /></button>
            </header>
            <div className="news-meta-modal-body">
              <div className="news-meta-grid">
                <CategorySelect scope="posts" required showManageLink={false} value={post.categoryId} onChange={(categoryId) => { if (categoryId) patch({ categoryId }); }} />
                <label><span>เจ้าของเนื้อหา</span><NativeSelect value={post.unitId ?? "hospital"} onChange={(event) => patch({ unitId: event.target.value === "hospital" ? null : event.target.value })}>
                  <option value="hospital">โรงพยาบาล</option>
                  {ownerUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                </NativeSelect></label>
              </div>
              <div className="news-cover">
                <p className="news-cover-heading">รูปปกการ์ดข่าว</p>
                <NewsCoverEditor post={post} cover={cover} onChange={patch} />
                <div className="news-cover-actions">
                  <button type="button" onClick={() => setCoverPicker(true)}>{cover ? "เปลี่ยนรูป" : "เลือกจากคลังสื่อ"}</button>
                  {cover ? <button type="button" className="danger" onClick={() => setConfirmRemoveCover(true)}><Trash2 size={13} /> ลบรูป</button> : null}
                </div>
              </div>
            </div>
            <footer><button type="button" className="primary-button" onClick={() => setMetaOpen(false)}>เสร็จสิ้น</button></footer>
          </section>
        </div>
      ) : null}
      {coverPicker ? (
        <MediaPicker
          open
          currentId={post.coverMediaId}
          onClose={() => setCoverPicker(false)}
          onSelect={(item) => {
            patch({ coverMediaId: item.id, coverFit: post.coverMediaId ? post.coverFit : "cover", coverFocus: { x: 50, y: 50 }, coverZoom: 100 });
            setCoverPicker(false);
          }}
        />
      ) : null}
      {confirmSave ? <ConfirmDialog
        title="บันทึกการแก้ไขข่าว?"
        description={post.status === "published" ? "การแก้ไขจะถูกบันทึกเป็นร่าง หน้าเว็บไซต์ยังแสดงฉบับที่เผยแพร่อยู่" : "ข่าวจะถูกบันทึกเป็นฉบับร่าง และยังไม่แสดงบนเว็บไซต์"}
        confirmLabel="บันทึก"
        variant="default"
        pending={saving}
        onClose={() => setConfirmSave(false)}
        onConfirm={() => { setConfirmSave(false); void persist(false); }}
      /> : null}
      {pendingLeaveHref ? <ConfirmDialog
        title="ออกจากหน้าข่าวโดยไม่บันทึก?"
        description="การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป หากต้องการเก็บงานไว้ ให้ยกเลิกแล้วกดบันทึกก่อนออกจากหน้า"
        confirmLabel="ออกโดยไม่บันทึก"
        layerClassName="news-item-confirm-layer"
        onClose={() => setPendingLeaveHref(null)}
        onConfirm={() => {
          const destination = new URL(pendingLeaveHref);
          allowLeaveRef.current = true;
          setPendingLeaveHref(null);
          if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`);
          else window.location.assign(destination.href);
        }}
      /> : null}
      {confirmRemoveCover ? <ConfirmDialog
        title="ลบรูปปกการ์ดข่าว?"
        description="รูปปกจะถูกนำออกจากข่าวนี้ แต่ไฟล์ยังอยู่ในคลังสื่อ และการเปลี่ยนแปลงจะมีผลเมื่อบันทึกหรือเผยแพร่"
        confirmLabel="ลบรูปปก"
        layerClassName="news-cover-confirm-layer"
        onClose={() => setConfirmRemoveCover(false)}
        onConfirm={() => { patch({ coverMediaId: null }); setConfirmRemoveCover(false); }}
      /> : null}
      {pendingItemRemoval ? <ConfirmDialog
        title={`ลบ${pendingItemRemoval.label}นี้?`}
        description={`${pendingItemRemoval.label}จะถูกนำออกจาก Block และการเปลี่ยนแปลงจะมีผลเมื่อบันทึกหรือเผยแพร่`}
        confirmLabel={`ลบ${pendingItemRemoval.label}`}
        layerClassName="news-item-confirm-layer"
        onClose={() => setPendingItemRemoval(null)}
        onConfirm={() => { updateBlock(pendingItemRemoval.block); setPendingItemRemoval(null); }}
      /> : null}
      {confirmPublish ? <ConfirmDialog
        title="ยืนยันการเผยแพร่ข่าว"
        description={`“${post.title || "ข่าวใหม่"}” จะแสดงต่อผู้เข้าชมเว็บไซต์ทันที`}
        confirmLabel="เผยแพร่"
        variant="default"
        pending={saving}
        onClose={() => setConfirmPublish(false)}
        onConfirm={() => { setConfirmPublish(false); void persist(true); }}
      /> : null}
      {confirmDiscardDraft ? <ConfirmDialog
        title="ทิ้งร่างข่าว?"
        description="การแก้ไขที่ยังไม่ได้เผยแพร่ทั้งหมด รวมถึงบล็อกและข้อมูลข่าว จะถูกลบและคืนค่าเป็นฉบับที่เผยแพร่อยู่ การดำเนินการนี้ย้อนกลับไม่ได้"
        confirmLabel="ทิ้งร่าง"
        pending={saving}
        onClose={() => setConfirmDiscardDraft(false)}
        onConfirm={() => { void discardDraft(); }}
      /> : null}
      {pendingDeleteId !== null ? <ConfirmDialog
        title="ลบ Block นี้?"
        description="Block จะถูกนำออกจากเนื้อหาข่าว และการเปลี่ยนแปลงจะมีผลเมื่อบันทึกหรือเผยแพร่"
        confirmLabel="ลบ Block"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          patch({
            blocks: blocks.filter((item) => item.id !== pendingDeleteId),
          });
          setSelectedBlockId((current) =>
            current === pendingDeleteId ? null : current,
          );
          setSettingsBlockId((current) => current === pendingDeleteId ? null : current);
          setPendingDeleteId(null);
        }}
      /> : null}
    </div>
  );
}

function NewsArticlePreview({
  post,
  owner,
  mode,
  onModeChange,
  onClose,
}: {
  post: DemoPost;
  owner: string;
  mode: "desktop" | "tablet" | "mobile";
  onModeChange: (mode: "desktop" | "tablet" | "mobile") => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return (
    <div className="news-preview-layer">
      <button type="button" className="news-preview-backdrop" onClick={onClose} aria-label="ปิดตัวอย่าง" />
      <section className="news-preview-dialog" role="dialog" aria-modal="true" aria-label="ตัวอย่างหน้าข่าว">
        <header className="news-preview-toolbar">
          <div>
            <strong>ตัวอย่างหน้าข่าว</strong>
            <small>แสดงข้อมูลล่าสุดที่กำลังแก้ไข ยังไม่ต้องบันทึก</small>
          </div>
          <div className="news-preview-controls" role="group" aria-label="ขนาดตัวอย่าง">
            <button type="button" aria-pressed={mode === "desktop"} onClick={() => onModeChange("desktop")}><Monitor size={16} /> เดสก์ท็อป</button>
            <button type="button" aria-pressed={mode === "tablet"} onClick={() => onModeChange("tablet")}><Tablet size={16} /> แท็บเล็ต</button>
            <button type="button" aria-pressed={mode === "mobile"} onClick={() => onModeChange("mobile")}><Smartphone size={16} /> มือถือ</button>
          </div>
          <button type="button" className="news-preview-close" onClick={onClose} aria-label="ปิดตัวอย่าง"><X size={20} /></button>
        </header>
        <div className="news-preview-scroll">
          <div className={`news-preview-frame ${mode}`}>
            <div className="public-news-page">
              <article className="public-news-article">
                <header>
                  <span>{categoryName(readCategories("posts"), post.categoryId)}</span>
                  <h1>{post.title || "ชื่อข่าว"}</h1>
                  <div className="public-news-meta">
                    <span><CalendarDays size={16} /> วันที่เผยแพร่ {post.publishedAt ?? "ยังไม่เผยแพร่"}</span>
                    <span>โดย {owner}</span>
                  </div>
                </header>
                <div className="public-news-body">
                  <BlockRenderer blocks={post.blocks} pdfPositionOnly />
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArticleInsertLine({
  index,
  active,
  onOpen,
}: {
  index: number;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      className={`article-insert-line ${active ? "open" : ""}`}
      data-index={index}
    >
      <span aria-hidden="true" />
      <button
        type="button"
        aria-label={`เพิ่มเนื้อหาตำแหน่งที่ ${index + 1}`}
        onClick={onOpen}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function ArticleInsertModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: ArticleKind) => void;
}) {
  const [search, setSearch] = useState("");
  const kinds = insertableArticleKinds.filter((item) =>
    item.label
      .toLocaleLowerCase("th")
      .includes(search.toLocaleLowerCase("th")),
  );
  return (
    <div className="builder-modal-layer">
      <button
        type="button"
        className="builder-modal-backdrop"
        onClick={onClose}
        aria-label="ปิดหน้าต่างเลือกเนื้อหา"
      />
      <div className="insert-block-modal" role="dialog" aria-modal="true" aria-labelledby="article-insert-title">
        <header>
          <strong id="article-insert-title">เพิ่มเนื้อหา</strong>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </header>
        <label>
          <Search size={15} />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาเนื้อหา..."
          />
        </label>
        <div className="insert-block-grid">
          {kinds.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.type}
                onClick={() => onPick(item.type)}
              >
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

