"use client";

import { createId } from "@/utils/create-id";

import { showGlobalToast } from "@/components/ui/global-toast";
import { PublishDropdown } from "@/components/admin/publish-dropdown";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog as SystemConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnchoredSelect } from "@/components/ui/anchored-select";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  Columns2,
  Columns3,
  Columns4,
  Contact,
  Clock3,
  Clock5,
  Clock7,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileSearch,
  FilePenLine,
  FolderArchive,
  GalleryHorizontal,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  Images,
  Info,
  LayoutGrid,
  Layers,
  List,
  ListChecks,
  MapPinned,
  Milestone,
  Move,
  PanelsTopLeft,
  Link2,
  Megaphone,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  Newspaper,
  Paperclip,
  Plus,
  Redo2,
  Quote,
  Save,
  Search,
  Send,
  Settings2,
  Smartphone,
  Table2,
  Tablet,
  Trash2,
  TriangleAlert,
  Type,
  Undo2,
  UserRound,
  Video,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent,
} from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { moduleRouteCatalog, selectableModuleRoutes } from "@/features/navigation/module-routes";
import { navigationIconNames, type NavigationIconName } from "@/features/navigation/icon-names";
import { NavigationIcon, navigationIcons } from "@/features/navigation/navigation-icons";
import { BlockRenderer, blockContainerClassName } from "../blocks/renderers/block-renderer";
import { PageHeaderBanner } from "./page-header-banner";
import { PublicContentPage } from "./public-content-page";
import { PublicHome } from "./public-home";
import {
  blockPositionsForWidth,
  normalizeBlockPosition,
} from "../blocks/config/layout";
import {
  createBlock,
  labels,
  type BuilderBlock,
  type BuilderKind,
  type DemoPage,
} from "../demo/model";
import {
  pagesChangeEvent,
  readPageSummaries,
  refreshPageSummaries,
} from "../demo/page-list-storage";
import type { DemoPageSummary } from "../demo/pages";
import { MediaPicker } from "@/features/media/components/media-picker";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { AccessControlButton, AccessControlDialog } from "@/features/access/components/access-control-dialog";
import type { AccessGrants, AccessLevel, AccessOptions } from "@/features/access/types";
import {
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import { displayMediaFor } from "@/features/media/resolved-media";
import { RichTextEditor } from "../blocks/editors/rich-text-editor-client";
import { SecondaryRichTextEditor } from "../blocks/editors/secondary-rich-text-editor";
import { ImageDisplaySettings } from "../blocks/editors/image-display-settings";
import { TableSettings } from "../blocks/editors/table-settings";
import { TableCanvasEditor } from "../blocks/editors/table-canvas-editor";
import { fetchPublicDocumentPage } from "@/features/documents/demo/storage";
import { StatisticsSettings } from "../blocks/editors/statistics-settings";
import {
  ContactInfoSettings,
  MapSettings,
  PersonnelSettings,
  ProcessStepsSettings,
  TimelineSettings,
} from "../blocks/editors/extended-block-settings";
import { CategorySelect } from "@/features/categories/components/category-select";
import { readUnits, refreshUnits } from "@/features/units/demo/storage";
import type { LinkTarget } from "@/types/content";
import type { BlockConfigMap, MediaInteraction } from "../blocks/config/types";

const blockKinds: BuilderKind[] = [
  "bannerSlider",
  "heading",
  "text",
  "image",
  "cta",
  "linkCards",
  "serviceGroups",
  "gallery",
  "quote",
  "video",
  "pdfViewer",
  "downloads",
  "documentList",
  "schedule",
  "faq",
  "table",
  "statistics",
  "processSteps",
  "contactInfo",
  "map",
  "timeline",
  "alert",
  "divider",
  "posts",
  "newsTabs",
  "documents",
  "iframe",
];
const blockIcons = {
  hero: Monitor,
  bannerSlider: GalleryHorizontal,
  heading: Heading2,
  text: Type,
  cardText: PanelsTopLeft,
  image: ImageIcon,
  imageText: ImageIcon,
  cta: MousePointerClick,
  links: Link2,
  linkCards: LayoutGrid,
  serviceGroups: PanelsTopLeft,
  gallery: Images,
  quote: Quote,
  video: Video,
  pdfViewer: FileSearch,
  downloads: Paperclip,
  documentList: FileSearch,
  schedule: CalendarDays,
  faq: CircleHelp,
  table: Table2,
  statistics: LayoutGrid,
  personnel: UserRound,
  processSteps: ListChecks,
  contactInfo: Contact,
  map: MapPinned,
  timeline: Milestone,
  alert: Megaphone,
  divider: Minus,
  posts: Newspaper,
  newsTabs: Newspaper,
  documents: FolderArchive,
  iframe: Monitor,
  spacer: MoveVertical,
} satisfies Record<BuilderKind, typeof Type>;
const viewports = {
  desktop: "1280px",
  tablet: "768px",
  mobile: "390px",
} as const;
type Viewport = keyof typeof viewports;
type SaveState = "saved" | "unsaved" | "saving";
const hydrate = () => () => {};

type HomeBuilderProps = { pageId: string; initialPage: DemoPage; initialPublishedPage: DemoPage | null; summary: DemoPageSummary; initialAccessLevel: AccessLevel; initialAccessGrants: AccessGrants; accessOptions: AccessOptions };

type SavedPageResponse = {
  summary: DemoPageSummary;
  page: DemoPage;
  publishedPage: DemoPage | null;
  accessLevel: AccessLevel;
  accessGrants: AccessGrants;
  revision: number;
};

function pageSnapshot(page: DemoPage, accessLevel: AccessLevel, accessGrants: AccessGrants) {
  return JSON.stringify({ page, accessLevel, accessGrants });
}

export function HomeBuilder(props: HomeBuilderProps) {
  const ready = useSyncExternalStore(
    hydrate,
    () => true,
    () => false,
  );
  return ready ? (
    <Builder {...props} />
  ) : (
    <p className="empty">กำลังเปิด Page Builder…</p>
  );
}

function Builder({ pageId, initialPage, initialPublishedPage, summary, initialAccessLevel, initialAccessGrants, accessOptions }: HomeBuilderProps) {
  const router = useRouter();
  const pagePath = summary.path;
  const [page, setPage] = useState<DemoPage>(initialPage);
  const [publishedPage, setPublishedPage] = useState<DemoPage | null>(initialPublishedPage);
  const [pageStatus, setPageStatus] = useState(summary.status);
  const [savedSnapshot, setSavedSnapshot] = useState(() => pageSnapshot(initialPage, initialAccessLevel, initialAccessGrants));
  const [revision, setRevision] = useState(summary.revision);
  const [past, setPast] = useState<BuilderBlock[][]>([]);
  const [future, setFuture] = useState<BuilderBlock[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [settingsBlockId, setSettingsBlockId] = useState<string | null>(null);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [pageHeaderPickerOpen, setPageHeaderPickerOpen] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [preview, setPreview] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(initialAccessLevel);
  const [accessGrants, setAccessGrants] = useState<AccessGrants>(initialAccessGrants);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null | "end">(null);
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | "leave" | "delete" | "discard" | null>(
    null,
  );
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const setToast = showGlobalToast;
  const settingsBlock =
    page.blocks.find((block) => block.id === settingsBlockId) ?? null;
  const pendingDeleteBlock =
    page.blocks.find((block) => block.id === pendingDeleteId) ?? null;
  const hasChanges = savedSnapshot !== pageSnapshot(page, accessLevel, accessGrants);
  const savedPage = (JSON.parse(savedSnapshot) as { page: DemoPage }).page;
  const hasUnpublishedChanges = pageStatus === "published" && publishedPage !== null && JSON.stringify(savedPage) !== JSON.stringify(publishedPage);
  const showDraftNotice = hasChanges || hasUnpublishedChanges || pageStatus === "draft";
  const draftLabels = new Map<string, string>();
  const publishedBlocks = publishedPage?.blocks ?? [];
  for (const [index, block] of page.blocks.entries()) {
    const publishedIndex = publishedBlocks.findIndex((item) => item.id === block.id);
    const savedBlock = savedPage.blocks.find((item) => item.id === block.id);
    const isSaved = savedBlock !== undefined && JSON.stringify(savedBlock) === JSON.stringify(block);
    if (pageStatus === "draft" || publishedIndex < 0) {
      draftLabels.set(block.id, isSaved ? "บันทึกร่างแล้ว" : "ยังไม่บันทึก");
    } else if (publishedIndex !== index || JSON.stringify(publishedBlocks[publishedIndex]) !== JSON.stringify(block)) {
      draftLabels.set(block.id, isSaved ? "ร่างที่ยังไม่เผยแพร่" : "ยังไม่บันทึก");
    }
  }

  useEffect(() => { void refreshPageSummaries().catch(() => undefined); }, []);

  function commit(blocks: BuilderBlock[]) {
    setPast((value) => [...value.slice(-29), page.blocks]);
    setFuture([]);
    setPage((value) => ({ ...value, blocks }));
    setSaveState("unsaved");
  }
  function undo() {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((value) => [page.blocks, ...value]);
    setPage((value) => ({ ...value, blocks: previous }));
    setPast((value) => value.slice(0, -1));
    setSaveState("unsaved");
  }
  function redo() {
    const next = future[0];
    if (!next) return;
    setPast((value) => [...value, page.blocks]);
    setPage((value) => ({ ...value, blocks: next }));
    setFuture((value) => value.slice(1));
    setSaveState("unsaved");
  }
  function addBlock(kind: BuilderKind, index = page.blocks.length) {
    const block = createBlock(kind, createId());
    commit([
      ...page.blocks.slice(0, index),
      block,
      ...page.blocks.slice(index),
    ]);
    setSelected(block.id);
    setInsertAt(null);
  }
  function updateBlock(next: BuilderBlock) {
    commit(page.blocks.map((block) => (block.id === next.id ? next : block)));
  }
  function updatePageHeader(change: Partial<DemoPage["header"]>) {
    setPage((value) => ({
      ...value,
      header: { ...value.header, ...change },
    }));
    setSaveState("unsaved");
  }
  function duplicate(id: string) {
    const index = page.blocks.findIndex((block) => block.id === id);
    const source = page.blocks[index];
    if (!source) return;
    const copy = { ...source, id: createId() } as BuilderBlock;
    commit([
      ...page.blocks.slice(0, index + 1),
      copy,
      ...page.blocks.slice(index + 1),
    ]);
  }
  function toggleVisibility(id: string) {
    commit(
      page.blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              visibility: block.visibility === "visible" ? "hidden" : "visible",
            }
          : block,
      ),
    );
  }
  function removePendingBlock() {
    if (!pendingDeleteId) return;
    commit(page.blocks.filter((block) => block.id !== pendingDeleteId));
    if (selected === pendingDeleteId) setSelected(null);
    if (settingsBlockId === pendingDeleteId) setSettingsBlockId(null);
    setPendingDeleteId(null);
    setConfirm(null);
    setToast({
      title: "ลบ Block แล้ว",
      description: "สามารถกด Undo เพื่อเรียกคืนได้",
    });
  }
  async function persist(publish: boolean) {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", page, publish, accessLevel, accessGrants, revision }),
      });
      if (!response.ok) {
        const data: unknown = await response.json();
        throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "บันทึกหน้าไม่สำเร็จ");
      }
      const saved = await response.json() as SavedPageResponse;
      if (typeof saved !== "object" || saved === null || typeof saved.revision !== "number" || !saved.page) throw new Error("ข้อมูลหน้าที่ตอบกลับไม่ถูกต้อง");
      setPage(saved.page);
      setPublishedPage(saved.publishedPage);
      setPageStatus(saved.summary.status);
      setRevision(saved.revision);
      setSavedSnapshot(pageSnapshot(saved.page, saved.accessLevel, saved.accessGrants));
      await refreshPageSummaries();
      setSaveState("saved");
      setToast({
        title: publish ? "เผยแพร่เรียบร้อยแล้ว" : "บันทึกเรียบร้อยแล้ว",
        description: publish
          ? `หน้า /${pagePath} แสดง Block ชุดล่าสุดแล้ว`
          : `บันทึก ${page.title} เป็นฉบับร่างแล้ว`,
      });
    } catch (error) {
      setSaveState("unsaved");
      setToast({
        title: "บันทึกไม่สำเร็จ",
        description: error instanceof Error
            ? error.message
            : "ข้อมูลบางส่วนไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
        variant: "error",
      });
    }
  }
  async function discardDraft() {
    if (saveState === "saving" || !hasUnpublishedChanges) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discardDraft", revision }),
      });
      const restored = await response.json() as SavedPageResponse | { error?: string };
      if (!response.ok) throw new Error("error" in restored && restored.error ? restored.error : "ยกเลิกร่างไม่สำเร็จ");
      if (!("page" in restored) || !("summary" in restored)) throw new Error("ข้อมูลหน้าที่ตอบกลับไม่ถูกต้อง");
      setPage(restored.page);
      setPublishedPage(restored.publishedPage);
      setPageStatus(restored.summary.status);
      setAccessLevel(restored.accessLevel);
      setAccessGrants(restored.accessGrants);
      setRevision(restored.revision);
      setSavedSnapshot(pageSnapshot(restored.page, restored.accessLevel, restored.accessGrants));
      setPast([]);
      setFuture([]);
      setSelected(null);
      setSettingsBlockId(null);
      setConfirm(null);
      setSaveState("saved");
      setToast({ title: "ยกเลิกร่างแล้ว", description: "กลับไปใช้ฉบับที่เผยแพร่อยู่ เว็บไซต์ไม่เปลี่ยนแปลง" });
    } catch (error) {
      setConfirm(null);
      setSaveState("saved");
      setToast({ title: "ยกเลิกร่างไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    }
  }
  async function unpublish() {
    if (saveState === "saving" || pageStatus !== "published") return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish", revision }),
      });
      const result = await response.json() as { summary?: { revision: number }; error?: string };
      if (!response.ok) throw new Error(result.error ?? "ยกเลิกเผยแพร่ไม่สำเร็จ");
      const refreshed = await fetch(`/api/pages/${encodeURIComponent(pageId)}`, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("โหลดข้อมูลหน้าหลังยกเลิกเผยแพร่ไม่สำเร็จ");
      const updated = await refreshed.json() as SavedPageResponse;
      setPage(updated.page);
      setPublishedPage(updated.publishedPage);
      setPageStatus(updated.summary.status);
      setRevision(updated.revision);
      setAccessLevel(updated.accessLevel);
      setAccessGrants(updated.accessGrants);
      setSavedSnapshot(pageSnapshot(updated.page, updated.accessLevel, updated.accessGrants));
      setSaveState("saved");
      setConfirm(null);
      await refreshPageSummaries();
      setToast({ title: "ยกเลิกเผยแพร่แล้ว", description: `หน้า ${page.title} ไม่แสดงบนเว็บไซต์แล้ว` });
    } catch (error) {
      setSaveState("saved");
      setConfirm(null);
      setToast({ title: "ยกเลิกเผยแพร่ไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    }
  }
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    if (result.type === "page-layer") {
      const blocks = [...page.blocks];
      const [moved] = blocks.splice(result.source.index, 1);
      if (!moved) return;
      blocks.splice(result.destination.index, 0, moved);
      commit(blocks);
      return;
    }
    if (result.type === "document-list-item") {
      if (result.destination.droppableId !== result.source.droppableId) return;
      const blockId = result.source.droppableId.replace("document-list-items-", "");
      const block = page.blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "documentList") return;
      const items = [...block.config.items];
      const [moved] = items.splice(result.source.index, 1);
      if (!moved) return;
      items.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, items } });
      return;
    }
    if (result.type === "service-link") {
      const block = page.blocks.find((item) => item.type === "serviceGroups" && item.config.groups.some((group) => `service-links:${item.id}:${group.id}` === result.source.droppableId));
      if (!block || block.type !== "serviceGroups") return;
      const group = block.config.groups.find((item) => `service-links:${block.id}:${item.id}` === result.source.droppableId);
      if (!group || result.destination.droppableId !== result.source.droppableId) return;
      const items = [...group.items];
      const [moved] = items.splice(result.source.index, 1);
      if (!moved) return;
      items.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, groups: block.config.groups.map((item) => item.id === group.id ? { ...item, items } : item) } });
      return;
    }
    if (result.type === "news-tab") {
      const blockId = result.source.droppableId.replace("news-tabs-", "");
      const block = page.blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "newsTabs") return;
      const tabs = [...block.config.tabs];
      const [moved] = tabs.splice(result.source.index, 1);
      if (!moved) return;
      tabs.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, tabs } });
      return;
    }
    if (result.type === "link-card") {
      const blockId = result.source.droppableId.replace("link-cards-", "");
      const block = page.blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "linkCards") return;
      const items = [...block.config.items];
      const [moved] = items.splice(result.source.index, 1);
      if (!moved) return;
      items.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, items } });
      return;
    }
    if (result.type === "document-tab") {
      const blockId = result.source.droppableId.replace("document-tabs-", "");
      const block = page.blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "documents") return;
      const tabs = [...block.config.tabs];
      const [moved] = tabs.splice(result.source.index, 1);
      if (!moved) return;
      tabs.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, tabs } });
      return;
    }
    if (result.type === "banner-slide") {
      const blockId = result.source.droppableId.replace("slides-", "");
      const block = page.blocks.find((item) => item.id === blockId);
      if (!block || block.type !== "bannerSlider") return;
      const slides = [...block.config.slides];
      const [moved] = slides.splice(result.source.index, 1);
      if (!moved) return;
      slides.splice(result.destination.index, 0, moved);
      updateBlock({ ...block, config: { ...block.config, slides } });
      return;
    }
    if (result.source.droppableId === "canvas") {
      const blocks = [...page.blocks];
      const [moved] = blocks.splice(result.source.index, 1);
      if (moved) {
        blocks.splice(result.destination.index, 0, moved);
        commit(blocks);
      }
    }
  }
  function goBack() {
    if (hasChanges) {
      setPendingLeaveHref(new URL("/admin/pages", window.location.origin).href);
      setConfirm("leave");
    } else router.push("/admin/pages");
  }

  function leaveWithoutSaving() {
    if (!pendingLeaveHref) return;
    const destination = new URL(pendingLeaveHref);
    const snapshot = JSON.parse(savedSnapshot) as { page: DemoPage; accessLevel: AccessLevel; accessGrants: AccessGrants };
    allowLeaveRef.current = true;
    flushSync(() => {
      setPage(snapshot.page);
      setAccessLevel(snapshot.accessLevel);
      setAccessGrants(snapshot.accessGrants);
      setPast([]);
      setFuture([]);
      setSelected(null);
      setSettingsBlockId(null);
      setPageSettingsOpen(false);
      setSaveState("saved");
      setConfirm(null);
      setPendingLeaveHref(null);
    });
    window.location.assign(destination.href);
  }

  useEffect(() => {
    const reloadRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", reloadRestoredPage);
    return () => window.removeEventListener("pageshow", reloadRestoredPage);
  }, []);

  useEffect(() => {
    if (!hasChanges) return;
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
      if ((destination.protocol !== "http:" && destination.protocol !== "https:") || destination.href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeaveHref(destination.href);
      setConfirm("leave");
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLink, true);
    };
  }, [hasChanges]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]"))
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key === "Escape") {
        if (settingsBlockId) setSettingsBlockId(null);
        else setSelected(null);
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  });

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="page-builder-shell">
          <header className="page-builder-toolbar">
            <div className="builder-toolbar-title">
              <IconButton label="กลับหน้ารายการ" onClick={goBack}>
                <ArrowLeft size={17} />
              </IconButton>
              <div>
                <input
                  aria-label="ชื่อหน้า"
                  value={page.title}
                  onChange={(event) => {
                    setPage((value) => ({
                      ...value,
                      title: event.target.value,
                    }));
                    setSaveState("unsaved");
                  }}
                />
              </div>
            </div>
            <div className="builder-toolbar-actions">
              {!preview ? (
                <button
                  type="button"
                  className={`builder-page-settings-trigger builder-page-config-trigger${pageSettingsOpen ? " active" : ""}`}
                  aria-label="ตั้งค่าหน้า"
                  title="ตั้งค่าหน้า"
                  onClick={() => {
                    setPageSettingsOpen((value) => !value);
                    setSettingsBlockId(null);
                  }}
                >
                  <Settings2 size={16}/>
                  <span>ตั้งค่าหน้า</span>
                </button>
              ) : null}
              {!preview ? (
                <div className="builder-undo">
                  <IconButton
                    label="ย้อนกลับ"
                    disabled={!past.length}
                    onClick={undo}
                  >
                    <Undo2 size={16} />
                  </IconButton>
                  <IconButton
                    label="ทำซ้ำ"
                    disabled={!future.length}
                    onClick={redo}
                  >
                    <Redo2 size={16} />
                  </IconButton>
                </div>
              ) : null}
              {preview ? <div className="builder-viewports">
                {(["desktop", "tablet", "mobile"] as const).map((value) => {
                  const Icon = value === "desktop" ? Monitor : value === "tablet" ? Tablet : Smartphone;
                  return <button key={value} type="button" className={viewport === value ? "active" : ""} aria-label={value} onClick={() => setViewport(value)}><Icon size={16}/></button>;
                })}
              </div> : null}
              {!preview ? <AccessControlButton level={pageId === "home" ? "PUBLIC" : accessLevel} disabled={pageId === "home"} onClick={() => setAccessDialogOpen(true)}/> : null}
            </div>
          </header>
          <div className="page-builder-workspace">
            <main className="builder-canvas-wrap">
              {!preview && showDraftNotice ? (
                <section className="splash-draft-notice" aria-live="polite">
                  <div>
                    <strong>{hasChanges ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : hasUnpublishedChanges ? "มีร่างที่บันทึกแล้ว ยังไม่ได้เผยแพร่" : "บันทึกร่างแล้ว ยังไม่ได้เผยแพร่"}</strong>
                    {hasUnpublishedChanges || pageStatus === "draft" ? <p>{pageStatus === "published" ? "หน้าเว็บไซต์ยังแสดงฉบับเดิม" : "หน้านี้ยังไม่แสดงบนเว็บไซต์"}</p> : null}
                  </div>
                  {hasUnpublishedChanges ? (
                    <button type="button" disabled={saveState === "saving"} onClick={() => setConfirm("discard")}>
                      <RotateCcw size={16}/>ยกเลิกร่างที่บันทึก
                    </button>
                  ) : null}
                </section>
              ) : null}
              <div
                className={`builder-viewport is-${viewport}`}
                style={{ maxWidth: viewports[viewport] }}
              >
                <div className={`builder-page ${preview ? "preview-mode" : "edit-mode"}`}>
                  {preview ? <div className="builder-canvas">
                    {pageId === "home" ? <PublicHome page={page} initialDocumentPages={{}} /> : <PublicContentPage page={page} initialDocumentPages={{}} />}
                  </div> :
                  <Droppable droppableId="canvas" type="block">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`builder-canvas ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                      >
                        <PageHeaderBanner page={page}/>
                        {page.blocks.length === 0 && !preview ? (
                          <EmptyBuilder onAdd={() => setInsertAt("end")} />
                        ) : null}
                        {page.blocks.length > 0 && !preview ? (
                          <div className="builder-insert-line builder-insert-line-first">
                            <button
                              type="button"
                              aria-label="เพิ่ม Block ด้านบนสุด"
                              onClick={() => setInsertAt(0)}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        ) : null}
                        {page.blocks.map((block, index) => (
                          <Fragment key={block.id}>
                            <Draggable
                              draggableId={block.id}
                              index={index}
                              isDragDisabled={preview}
                            >
                              {(drag, state) => (
                                <div
                                  id={`builder-block-${block.id}`}
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  className={`builder-block ${block.visibility === "hidden" ? "hidden-block" : ""} ${!preview && selected === block.id ? "selected" : ""} ${state.isDragging ? "dragging" : ""}`}
                                >
                                  {!preview ? (
                                    <div className="builder-block-actions">
                                      <span {...drag.dragHandleProps}>
                                        <GripVertical size={15} />
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelected(block.id);
                                          setSettingsBlockId(block.id);
                                        }}
                                        aria-label={`ตั้งค่า ${labels[block.type]}`}
                                        title="ตั้งค่า Block"
                                      >
                                        <Settings2 size={14} />
                                      </button>
                                      <button onClick={() => duplicate(block.id)} aria-label="ทำสำเนา">
                                        <Copy size={14} />
                                      </button>
                                      <button
                                        onClick={() => toggleVisibility(block.id)}
                                        aria-label={block.visibility === "visible" ? "ซ่อน" : "แสดง"}
                                      >
                                        {block.visibility === "visible" ? <EyeOff size={14} /> : <Eye size={14} />}
                                      </button>
                                      <button
                                        className="danger"
                                        onClick={() => {
                                          setPendingDeleteId(block.id);
                                          setConfirm("delete");
                                        }}
                                        aria-label="ลบ"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ) : null}
                                  {!preview && draftLabels.has(block.id) ? (
                                    <span className="news-block-draft-label"><FilePenLine size={13}/>{draftLabels.get(block.id)}</span>
                                  ) : null}
                                  <div
                                    className={`builder-block-preview${block.type === "text" || block.type === "cardText" ? " inline-rich-text" : ""}`}
                                    role="group"
                                    aria-label={`${labels[block.type]} Block`}
                                    tabIndex={preview ? undefined : 0}
                                    onClick={() =>
                                      !preview && setSelected(block.id)
                                    }
                                    onKeyDown={(event) => {
                                      if (
                                        !preview &&
                                        event.target === event.currentTarget &&
                                        (event.key === "Enter" ||
                                          event.key === " ")
                                      ) {
                                        event.preventDefault();
                                        setSelected(block.id);
                                      }
                                    }}
                                  >
                                    {!preview && (block.type === "text" || block.type === "cardText") ? (
                                      <section className={blockContainerClassName(block)}>
                                        <RichTextEditor key={block.id} value={block.config.content} onChange={(content) => {
                                          if (block.type === "cardText") updateBlock({ ...block, config: { ...block.config, content } });
                                          else updateBlock({ ...block, config: { content } });
                                        }} />
                                      </section>
                                    ) : !preview && block.type === "table" ? (
                                      <section className={blockContainerClassName(block)}>
                                        <TableCanvasEditor config={block.config} onChange={(config) => updateBlock({ ...block, config })} />
                                      </section>
                                    ) : !preview && block.type === "documentList" ? (
                                      <section className={blockContainerClassName(block)}>
                                        <DocumentListCanvasEditor config={block.config} onChange={(config) => updateBlock({ ...block, config })} />
                                      </section>
                                    ) : (
                                      <BlockRenderer blocks={[block]} adminPreview={!preview} />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                            {!preview ? (
                              <div className="builder-insert-line">
                                <button
                                  type="button"
                                  aria-label="เพิ่ม Block ตรงนี้"
                                  onClick={() => setInsertAt(index + 1)}
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            ) : null}
                          </Fragment>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>}
                </div>
              </div>
            </main>
            {!preview && settingsBlock && confirm !== "delete" ? (
              <BlockSettings
                block={settingsBlock}
                onChange={updateBlock}
                onClose={() => setSettingsBlockId(null)}
                inlineTextEditing={settingsBlock.type === "text" || settingsBlock.type === "cardText"}
              />
            ) : null}
            {!preview && pageSettingsOpen ? (
              <PageSettingsPanel
                page={page}
                onChange={updatePageHeader}
                onClose={() => setPageSettingsOpen(false)}
                onPickImage={() => setPageHeaderPickerOpen(true)}
              />
            ) : null}
          </div>
          <div className="news-editor-toolbar builder-command-toolbar" role="toolbar" aria-label="เครื่องมือจัดการหน้าเว็บไซต์">
            <div className="news-editor-toolbar-tools">
              {!preview ? (
                <button type="button" aria-haspopup="dialog" aria-label={`บล็อกทั้งหมด ${page.blocks.length} บล็อก`} title="บล็อกทั้งหมด" onClick={() => setLayersOpen(true)}>
                  <Layers size={17}/><span className="news-toolbar-label">บล็อกทั้งหมด</span><span className="news-editor-toolbar-count">{page.blocks.length}</span>
                </button>
              ) : null}
              <button type="button" aria-label={preview ? "ออกจากตัวอย่าง" : "ดูตัวอย่าง"} title={preview ? "ออกจากตัวอย่าง" : "ดูตัวอย่าง"} onClick={() => { if (preview) setViewport("desktop"); setPreview((value) => !value); }}>
                <Eye size={17}/><span className="news-toolbar-label">{preview ? "ออกจากตัวอย่าง" : "ดูตัวอย่าง"}</span>
              </button>
            </div>
            <div className="news-editor-toolbar-actions">
              <button type="button" className="builder-save" aria-label="บันทึกร่าง" title="บันทึกร่าง" disabled={saveState === "saving" || !hasChanges} onClick={() => persist(false)}>
                <Save size={16}/><span className="news-toolbar-label">บันทึกร่าง</span>
              </button>
              <div className="admin-publish-split">
                <button type="button" className="builder-publish primary-button" aria-label="เผยแพร่" title="เผยแพร่" disabled={saveState === "saving" || (pageStatus === "published" && !hasChanges && !hasUnpublishedChanges)} onClick={() => setConfirm("publish")}><Send size={16}/><span className="news-toolbar-label">เผยแพร่</span></button>
                {pageStatus === "published" ? <PublishDropdown disabled={saveState === "saving"} onUnpublish={() => setConfirm("unpublish")}/> : null}
              </div>
            </div>
          </div>
          {accessDialogOpen ? <AccessControlDialog initialLevel={accessLevel} initialGrants={accessGrants} options={accessOptions} onClose={() => setAccessDialogOpen(false)} onSave={(level, grants) => { if (level !== accessLevel || JSON.stringify(grants) !== JSON.stringify(accessGrants)) { setAccessLevel(level); setAccessGrants(grants); setSaveState("unsaved"); } }}/> : null}
          <InsertBlockModal
            open={insertAt !== null}
            onClose={() => setInsertAt(null)}
            onPick={(kind) =>
              addBlock(
                kind,
                insertAt === "end" || insertAt === null
                  ? page.blocks.length
                  : insertAt,
              )
            }
          />
          {pageHeaderPickerOpen ? <MediaPicker
            open
            acceptKind="image"
            currentId={page.header.imageId}
            onClose={() => setPageHeaderPickerOpen(false)}
            onSelect={(item) => {
              updatePageHeader({ imageId: item.id });
              setPageHeaderPickerOpen(false);
            }}
          /> : null}
          {layersOpen ? <PageBlockLayers
            blocks={page.blocks}
            selectedId={selected}
            draftLabels={draftLabels}
            onClose={() => setLayersOpen(false)}
            onSelect={(id) => {
              setSelected(id);
              setLayersOpen(false);
              requestAnimationFrame(() => document.getElementById(`builder-block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
            }}
          /> : null}
          {confirm === "delete" ? <SystemConfirmDialog
            title={`ลบ Block ${pendingDeleteBlock ? `“${labels[pendingDeleteBlock.type]}”` : "นี้"}?`}
            description="ตัว Block และข้อมูลทั้งหมดภายในจะถูกลบออกจากหน้า โดยสามารถกด Undo เพื่อเรียกคืนได้"
            confirmLabel="ลบ"
            onClose={() => {
              setConfirm(null);
              setPendingDeleteId(null);
            }}
            onConfirm={removePendingBlock}
          /> : null}
          {confirm === "publish" ? <SystemConfirmDialog
            variant="default"
            title="ยืนยันการเผยแพร่"
            description={`${page.title} จะแสดงต่อผู้เข้าชมเว็บไซต์ทันที`}
            confirmLabel="เผยแพร่"
            onClose={() => setConfirm(null)}
            onConfirm={() => {
              setConfirm(null);
              persist(true);
            }}
          /> : null}
          {confirm === "unpublish" ? <SystemConfirmDialog title="ยกเลิกเผยแพร่หน้าเว็บไซต์?" description={`หน้า ${page.title} จะไม่แสดงบนเว็บไซต์ การแก้ไขที่ยังไม่ได้บันทึกจะหายไป`} confirmLabel="ยกเลิกเผยแพร่" pending={saveState === "saving"} onClose={() => setConfirm(null)} onConfirm={() => { void unpublish(); }}/> : null}
          {confirm === "discard" ? <SystemConfirmDialog
            title="ยกเลิกร่างที่บันทึกไว้?"
            description="การแก้ไขในร่างจะถูกลบ และกลับไปใช้เนื้อหาฉบับที่เผยแพร่อยู่ เว็บไซต์จะไม่เปลี่ยนแปลง"
            confirmLabel="ยกเลิกร่าง"
            onClose={() => setConfirm(null)}
            onConfirm={() => { void discardDraft(); }}
          /> : null}
          {confirm === "leave" ? <SystemConfirmDialog
            title="มีการแก้ไขที่ยังไม่ได้บันทึก"
            description="หากออกจากหน้านี้ การแก้ไขล่าสุดจะหายไป"
            confirmLabel="ออกโดยไม่บันทึก"
            onClose={() => { setConfirm(null); setPendingLeaveHref(null); }}
            onConfirm={leaveWithoutSaving}
          /> : null}
        </div>
      </DragDropContext>
    </>
  );
}

function PageBlockLayers({ blocks, selectedId, draftLabels, onSelect, onClose }: {
  blocks: BuilderBlock[];
  selectedId: string | null;
  draftLabels: Map<string, string>;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={dialogRef} className="news-block-layers" aria-labelledby="page-block-layers-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="news-block-layers-panel">
      <header><div><Layers size={19}/><h2 id="page-block-layers-title">บล็อกทั้งหมด</h2><span>{blocks.length}</span></div><button type="button" onClick={onClose} aria-label="ปิดบล็อกทั้งหมด"><X size={19}/></button></header>
      <p>ลากเพื่อจัดลำดับ · กดรายการเพื่อไปยังบล็อก</p>
      <Droppable droppableId="page-block-layers" type="page-layer">
        {(drop) => <div className="news-block-layers-list" ref={drop.innerRef} {...drop.droppableProps}>
          {blocks.map((block, index) => {
            const Icon = blockIcons[block.type] ?? Type;
            const config = block.config as unknown as Record<string, unknown>;
            const title = typeof config.title === "string" ? config.title.trim() : "";
            const draftLabel = draftLabels.get(block.id) ?? "";
            return <Draggable key={block.id} draggableId={`layer-${block.id}`} index={index}>
              {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`news-block-layer${selectedId === block.id ? " selected" : ""}${snapshot.isDragging ? " dragging" : ""}`}>
                <span className="news-block-layer-handle" {...drag.dragHandleProps} aria-label={`ลากบล็อกที่ ${index + 1}: ${title || labels[block.type]}`}><GripVertical size={17}/></span>
                <button type="button" onClick={() => onSelect(block.id)} aria-current={selectedId === block.id ? "true" : undefined}>
                  <span className="news-block-layer-icon"><Icon size={19}/></span>
                  <span className="news-block-layer-copy"><strong>{title || labels[block.type]}</strong><small>{index + 1} · {labels[block.type]}{block.visibility === "hidden" ? " · ซ่อนอยู่" : ""}{draftLabel ? ` · ${draftLabel}` : ""}</small></span>
                  {block.visibility === "hidden" ? <EyeOff size={15} aria-label="ซ่อนอยู่"/> : null}
                </button>
              </div>}
            </Draggable>;
          })}
          {drop.placeholder}
          {!blocks.length ? <p className="news-block-layers-empty">ยังไม่มีบล็อกในหน้านี้</p> : null}
        </div>}
      </Droppable>
      <footer>การเปลี่ยนลำดับจะบันทึกพร้อมฉบับร่าง</footer>
    </div>
  </dialog>;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="builder-icon-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function EmptyBuilder({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="builder-empty">
      <div className="builder-empty-icon" aria-hidden="true">
        <PanelsTopLeft size={26} />
        <span><Plus size={11} /></span>
      </div>
      <strong>เริ่มสร้างหน้าเว็บไซต์</strong>
      <p>ลากบล็อกจากคลังด้านซ้ายมาวาง<br />หรือเพิ่มบล็อกแรกจากปุ่มด้านล่าง</p>
      <button className="primary-button" onClick={onAdd}>
        <Plus size={15} />
        เพิ่ม Block แรก
      </button>
      <small>จัดลำดับและปรับแต่งแต่ละบล็อกได้ภายหลัง</small>
    </div>
  );
}

function PageSettingsPanel({ page, onChange, onClose, onPickImage }: {
  page: DemoPage;
  onChange: (change: Partial<DemoPage["header"]>) => void;
  onClose: () => void;
  onPickImage: () => void;
}) {
  const [confirmRemoveImage, setConfirmRemoveImage] = useState(false);
  const media = displayMediaFor(page.header, "imageId");
  return <div className="block-settings-layer page-settings-layer">
    <button
      type="button"
      className="block-settings-backdrop"
      onClick={onClose}
      aria-label="ปิดการตั้งค่าหน้า"
    />
    <aside
      className="block-settings page-settings-panel"
      role="dialog"
      aria-modal="true"
      aria-label="ตั้งค่าหน้า"
    >
    <header>
      <div><strong>ตั้งค่าหน้า</strong><small>ส่วนหัวประจำหน้า</small></div>
      <button type="button" onClick={onClose} aria-label="ปิดการตั้งค่าหน้า"><X size={16}/></button>
    </header>
    <div className="block-settings-body">
      <section>
        <button type="button"><span>ส่วนหัวหน้า</span></button>
        <div>
          <div className="block-display-settings page-header-mode-settings">
            <IconChoiceField label="รูปแบบส่วนหัว" value={page.header.mode} onChange={(mode) => onChange({ mode })} options={[
              { value: "system", label: "ค่าเริ่มต้นระบบ", caption: "ระบบ", icon: <Monitor size={20}/> },
              { value: "custom", label: "กำหนดเอง", caption: "กำหนดเอง", icon: <Settings2 size={20}/> },
              { value: "hidden", label: "ไม่แสดงส่วนหัว", caption: "ไม่แสดง", icon: <EyeOff size={20}/> },
            ]}/>
          </div>
          {page.header.mode === "system" ? <p className="dynamic-note">ใช้ชื่อหน้า “{page.title}” และรูปแบบมาตรฐานของระบบ</p> : null}
          {page.header.mode === "custom" ? <>
            <Field label="ข้อความกำกับ"><input maxLength={100} value={page.header.eyebrow} placeholder="เช่น บริการโรงพยาบาล" onChange={(event) => onChange({ eyebrow: event.target.value })}/></Field>
            <Field label="หัวข้อ"><input maxLength={300} value={page.header.title} placeholder={page.title} onChange={(event) => onChange({ title: event.target.value })}/></Field>
            <Field label="คำอธิบาย"><textarea rows={3} maxLength={500} value={page.header.description} placeholder="คำอธิบายสั้น ๆ ของหน้านี้" onChange={(event) => onChange({ description: event.target.value })}/></Field>
            <div className="page-header-image-field">
              <div className="page-header-image-heading">
                <strong>รูปภาพส่วนหัว</strong>
                <small>ภาพพื้นหลังของส่วนหัวหน้า</small>
              </div>
              <div className={`page-header-image-preview${media ? " has-image" : ""}`} style={mediaPreviewStyle(media)}>
                {media ? null : <><ImageIcon size={25}/><span>ยังไม่ได้เลือกรูปภาพ</span></>}
              </div>
              {media ? <span className="page-header-image-name" title={media.name}>{media.name}</span> : null}
              <div className="page-header-image-actions">
                <button type="button" onClick={onPickImage}><ImageIcon size={16}/>{media ? "เปลี่ยนรูป" : "เลือกรูปจากคลังสื่อ"}</button>
                {media ? <button type="button" className="danger" onClick={() => setConfirmRemoveImage(true)}><Trash2 size={16}/>ลบรูป</button> : null}
              </div>
            </div>
          </> : null}
          {page.header.mode === "hidden" ? <p className="dynamic-note">หน้าเว็บจะเริ่มจาก Block แรกโดยไม่มีส่วนหัวประจำหน้า</p> : null}
        </div>
      </section>
    </div>
    </aside>
    {confirmRemoveImage ? <SystemConfirmDialog
      title="ลบรูปภาพส่วนหัว?"
      description="รูปภาพจะถูกนำออกจากส่วนหัวของหน้านี้เมื่อบันทึกการเปลี่ยนแปลง ไฟล์ในคลังสื่อยังคงอยู่"
      confirmLabel="ลบรูป"
      onClose={() => setConfirmRemoveImage(false)}
      onConfirm={() => {
        onChange({ imageId: null });
        setConfirmRemoveImage(false);
      }}
    /> : null}
  </div>;
}

export function BlockSettings({
  block,
  onChange,
  onClose,
  writingMode = false,
  inlineTextEditing = false,
  hideThemeControls = false,
  hidePdfAlignment = false,
}: {
  block: BuilderBlock;
  onChange: (block: BuilderBlock) => void;
  onClose: () => void;
  writingMode?: boolean;
  inlineTextEditing?: boolean;
  hideThemeControls?: boolean;
  hidePdfAlignment?: boolean;
}) {
  const showHeadingSize = new Set<BuilderKind>([
    "heading", "image", "imageText", "cta", "linkCards", "serviceGroups",
    "gallery", "table", "statistics", "personnel", "processSteps",
    "contactInfo", "map", "timeline", "quote", "alert", "video", "iframe", "pdfViewer",
    "downloads", "documentList", "posts", "newsTabs", "documents",
  ]).has(block.type);
  const legacyHeadingSize = "headingSize" in block.config ? block.config.headingSize : undefined;
  const update = (next: BuilderBlock["config"]) =>
    onChange({ ...block, config: next } as BuilderBlock);
  return (
    <div className={`block-settings-layer${writingMode ? " block-settings-writing" : ""}`}>
      <button
        type="button"
        className="block-settings-backdrop"
        onClick={onClose}
        aria-label="ปิดการตั้งค่า Block"
      />
      <aside
        className="block-settings"
        role="dialog"
        aria-modal="true"
        aria-label={`ตั้งค่า ${labels[block.type]}`}
      >
        <header>
          <div>
            <strong>ตั้งค่า Block</strong>
            <small>{labels[block.type]}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด">
            <X size={16} />
          </button>
        </header>
        <div className="block-settings-body">
        <SettingsSection title="เนื้อหา">
          {(block.type === "text" || block.type === "cardText") ? (
            <label className="settings-toggle block-visibility-toggle rich-text-card-toggle">
              <span>แสดงเป็นการ์ดข้อความ</span>
              <input type="checkbox" role="switch" checked={block.type === "cardText"} onChange={(event) => {
                if (event.target.checked && block.type === "text") onChange({ ...block, type: "cardText", config: { title: "", content: block.config.content } });
                if (!event.target.checked && block.type === "cardText") onChange({ ...block, type: "text", config: { content: block.config.content } });
              }} />
            </label>
          ) : null}
          {block.type === "hero" ? (
            <SingleBannerSettings block={block} onChange={onChange} />
          ) : block.type === "bannerSlider" ? (
            <BannerSliderSettings block={block} onChange={onChange} />
          ) : block.type === "heading" ? (
            <>
              <Field label="หัวข้อ">
                <input
                  value={block.config.text}
                  onChange={(event) =>
                    update({ ...block.config, text: event.target.value })
                  }
                />
              </Field>
              <Field label="คำอธิบาย">
                <textarea
                  rows={3}
                  value={block.config.description}
                  placeholder="เพิ่มคำอธิบายใต้หัวข้อ (ไม่บังคับ)"
                  onChange={(event) =>
                    update({ ...block.config, description: event.target.value })
                  }
                />
              </Field>
            </>
          ) : block.type === "text" ? (
            <Field label="ข้อความ">
              {inlineTextEditing ? (
                <p className="block-inline-edit-hint">พิมพ์และจัดรูปแบบข้อความได้โดยตรงบนบล็อก</p>
              ) : (
                <RichTextEditor
                  key={block.id}
                  value={block.config.content}
                  onChange={(content) => update({ content })}
                />
              )}
            </Field>
          ) : block.type === "cardText" ? (
            <p className="block-inline-edit-hint">พิมพ์ข้อความในบล็อกได้เลย การ์ดจะแสดงในหน้าดูตัวอย่างและหน้าเว็บไซต์</p>
          ) : block.type === "image" ? (
            <ImageBlockSettings block={block} onChange={onChange} />
          ) : block.type === "imageText" ? (
            <ImageTextSettings block={block} onChange={onChange} />
          ) : block.type === "cta" ? (
            <CtaSettings block={block} onChange={onChange} />
          ) : block.type === "links" ? (
            <LinksSettings block={block} onChange={onChange} />
          ) : block.type === "linkCards" ? (
            <LinkCardsSettings block={block} onChange={onChange} />
          ) : block.type === "serviceGroups" ? (
            <ServiceGroupsSettings block={block} onChange={onChange} />
          ) : block.type === "gallery" ? (
            <GallerySettings block={block} onChange={onChange} />
          ) : block.type === "quote" ? (
            <QuoteSettings block={block} onChange={onChange} />
          ) : block.type === "video" ? (
            <VideoSettings block={block} onChange={onChange} />
          ) : block.type === "pdfViewer" ? (
            <PdfViewerSettings block={block} onChange={onChange} hideAlignment={hidePdfAlignment} />
          ) : block.type === "downloads" ? (
            <DownloadsSettings block={block} onChange={onChange} />
          ) : block.type === "documentList" ? (
            <DocumentListSettings block={block} onChange={onChange} />
          ) : block.type === "schedule" ? (
            <ScheduleSettings block={block} onChange={onChange} />
          ) : block.type === "faq" ? (
            <FaqSettings block={block} onChange={onChange} />
          ) : block.type === "table" ? (
            <TableSettings
              config={block.config}
              onChange={(config) => onChange({ ...block, config })}
            />
          ) : block.type === "statistics" ? (
            <StatisticsSettings
              config={block.config}
              onChange={(config) => onChange({ ...block, config })}
            />
          ) : block.type === "personnel" ? (
            <PersonnelSettings config={block.config} onChange={(config) => onChange({ ...block, config })}/>
          ) : block.type === "processSteps" ? (
            <ProcessStepsSettings config={block.config} onChange={(config) => onChange({ ...block, config })}/>
          ) : block.type === "contactInfo" ? (
            <ContactInfoSettings config={block.config} onChange={(config) => onChange({ ...block, config })}/>
          ) : block.type === "map" ? (
            <MapSettings config={block.config} onChange={(config) => onChange({ ...block, config })}/>
          ) : block.type === "timeline" ? (
            <TimelineSettings config={block.config} onChange={(config) => onChange({ ...block, config })}/>
          ) : block.type === "alert" ? (
            <AlertSettings block={block} onChange={onChange} />
          ) : block.type === "divider" ? (
            <DividerSettings block={block} onChange={onChange} />
          ) : block.type === "spacer" ? (
            <>
              <div className="dynamic-note">
                ใช้เพิ่มช่องว่างเฉพาะจุดที่ต้องการแบ่งกลุ่มเนื้อหา
              </div>
              <Field label="ขนาดระยะห่าง">
                <NativeSelect
                  value={block.config.size}
                  onChange={(event) =>
                    update({
                      size: event.target.value as "small" | "medium" | "large",
                    })
                  }
                >
                  <option value="small">เล็ก</option>
                  <option value="medium">กลาง</option>
                  <option value="large">ใหญ่</option>
                </NativeSelect>
              </Field>
            </>
          ) : block.type === "posts" ? (
            <PostsSettings block={block} onChange={onChange} />
          ) : block.type === "newsTabs" ? (
            <NewsTabsSettings block={block} onChange={onChange} />
          ) : block.type === "documents" ? (
            <DocumentTabsSettings block={block} onChange={onChange} />
          ) : block.type === "iframe" ? (
            <IframeSettings block={block} onChange={onChange} />
          ) : null}
        </SettingsSection>
        <SettingsSection title="การแสดงผล">
          <div className="block-display-settings">
          <section className="block-display-section">
          <h3>ขนาดและตำแหน่ง</h3>
          <div className="block-display-grid">
          <WidthSetting value={block.width} onChange={(width) => onChange({
            ...block,
            width,
            position: normalizeBlockPosition(width, block.position),
          })} />
          <IconChoiceField className="block-heading-align-choice" label={block.type === "heading" ? "จัดแนวหัวข้อ" : "จัดแนวหัวข้อและคำอธิบาย"} value={block.headingAlign} onChange={(headingAlign) => onChange({ ...block, headingAlign })} options={[
            { value: "left", label: "ชิดซ้าย", caption: "ซ้าย", icon: <AlignLeft size={18} /> },
            { value: "center", label: "กึ่งกลาง", caption: "กลาง", icon: <AlignCenter size={18} /> },
            { value: "right", label: "ชิดขวา", caption: "ขวา", icon: <AlignRight size={18} /> },
          ]} />
          </div>
          <PositionSetting key={block.id} width={block.width} value={block.position} onChange={(position) => onChange({ ...block, position })} />
          </section>
          {(showHeadingSize || !hideThemeControls) ? <section className="block-display-section">
          <h3>{hideThemeControls ? "หัวข้อ" : "หัวข้อและพื้นหลัง"}</h3>
          <div className="block-display-grid">
          {showHeadingSize ? <IconChoiceField label="ขนาดหัวข้อ" className="block-heading-size-choice" value={block.headingSize ?? legacyHeadingSize ?? "standard"} onChange={(headingSize) => onChange({ ...block, headingSize })} options={[
            { value: "small", label: "เล็ก — 18px", caption: "เล็ก · 18", icon: <Type size={20}/> },
            { value: "standard", label: "มาตรฐาน — ค่าเดิม", caption: "ค่าเดิม", icon: <Type size={25}/> },
            { value: "large", label: "ใหญ่ — 28px", caption: "ใหญ่ · 28", icon: <Type size={30}/> },
          ]} /> : null}
          {!hideThemeControls ? <IconChoiceField label="พื้นหลัง" value={block.surface} onChange={(surface) => onChange({ ...block, surface })} options={[
            { value: "default", label: "ปกติ", icon: <span className="block-surface-swatch default" /> },
            { value: "muted", label: "พื้นอ่อน", icon: <span className="block-surface-swatch muted" /> },
            { value: "primary", label: "สีหลัก", icon: <span className="block-surface-swatch primary" /> },
          ]} /> : null}
          </div>
          {!hideThemeControls ? <IconChoiceField label="สัญลักษณ์หน้าหัวข้อ" value={block.headingAccent} onChange={(headingAccent) => onChange({ ...block, headingAccent })} options={[
            { value: "none", label: "ไม่แสดง", icon: <Ban size={18} /> },
            { value: "primary", label: "สีหลักของธีม", caption: "สีหลัก", icon: <span className="block-accent-icon primary" /> },
            { value: "secondary", label: "สีรองของธีม", caption: "สีรอง", icon: <span className="block-accent-icon secondary" /> },
            { value: "accent", label: "สีเน้นของธีม", caption: "สีเน้น", icon: <span className="block-accent-icon accent" /> },
          ]} /> : null}
          </section> : null}
          <section className="block-display-section">
          <h3><MoveVertical size={16}/>ระยะห่าง</h3>
          <div className="block-display-grid">
            <SpacingSetting side="top" value={block.surface === "default" ? block.spacingTop : "large"} disabled={block.surface !== "default"} onChange={(spacingTop) => onChange({ ...block, spacingTop })}/>
            <SpacingSetting side="bottom" value={block.surface === "default" ? block.spacingBottom : "large"} disabled={block.surface !== "default"} onChange={(spacingBottom) => onChange({ ...block, spacingBottom })}/>
          </div>
          {block.surface !== "default" ? <p className="block-display-hint">พื้นหลังนี้ใช้ระยะห่างระดับมากอัตโนมัติ</p> : null}
          </section>
          <label className="settings-toggle block-visibility-toggle">
            <span><Eye size={17}/>แสดงบล็อก</span>
            <input
              type="checkbox"
              checked={block.visibility === "visible"}
              onChange={(event) =>
                onChange({
                  ...block,
                  visibility: event.target.checked ? "visible" : "hidden",
                })
              }
            />
          </label>
          </div>
        </SettingsSection>
        </div>
      </aside>
    </div>
  );
}
function SingleBannerSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "hero" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const config = block.config;
  const [picker, setPicker] = useState(false);
  const media = displayMediaFor(config, "imageId");
  const update = (patch: Partial<typeof config>) =>
    onChange({ ...block, config: { ...config, ...patch } });

  return (
    <div className="slider-settings">
      <div className="block-display-settings banner-presentation-settings">
        <IconChoiceField
          label="รูปแบบแบนเนอร์"
          value={config.presentation}
          onChange={(presentation) =>
            update({
              presentation,
              height:
                presentation === "imageOnly"
                  ? "auto"
                  : config.height === "auto"
                    ? "standard"
                    : config.height,
            })
          }
          options={[
            { value: "content", label: "ข้อความและภาพ", icon: <Columns2 size={22} /> },
            { value: "imageOnly", label: "เฉพาะภาพ", icon: <ImageIcon size={22} /> },
          ]}
        />
      </div>
      {config.presentation === "content" ? (
        <BannerContentPositionField
          value={config.contentPosition}
          onChange={(contentPosition) => update({ contentPosition })}
        />
      ) : null}
      <BannerHeightField
        value={config.height}
        onChange={(height) => update({ height })}
      />
      <MediaField mediaId={config.imageId} source={config} onPick={() => setPicker(true)} />
      {media ? (
        <BannerFocalSetting
          mediaId={config.imageId}
          source={config}
          focalPoint={config.focalPoint}
          onChange={(focalPoint) => update({ focalPoint })}
        />
      ) : null}
      <MediaInteractionSettings
        value={config.imageInteraction}
        onChange={(imageInteraction) => update({ imageInteraction })}
      />
      <Field
        label={config.presentation === "imageOnly" ? "คำอธิบายภาพ" : "หัวเรื่อง"}
      >
        <textarea
          value={config.title}
          onChange={(event) => update({ title: event.target.value })}
        />
      </Field>
      {config.presentation === "content" ? (
        <Field label="คำอธิบาย">
          <SecondaryRichTextEditor
            value={config.description}
            onChange={(description) => update({ description })}
          />
        </Field>
      ) : null}
      {picker ? (
        <MediaPicker
          open
          currentId={config.imageId}
          onClose={() => setPicker(false)}
          onSelect={(item, alt) => {
            update({ imageId: item.id, title: alt || item.alt || config.title });
            setPicker(false);
          }}
        />
      ) : null}
    </div>
  );
}
function BannerSliderSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "bannerSlider" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const config = block.config;
  const [pickerSlideId, setPickerSlideId] = useState<string | null>(null);
  const [pendingSlideDeleteId, setPendingSlideDeleteId] = useState<string | null>(null);
  function updateSlide(
    id: string,
    patch: Partial<(typeof config.slides)[number]>,
  ) {
    onChange({
      ...block,
      config: {
        ...config,
        slides: config.slides.map((slide) =>
          slide.id === id ? { ...slide, ...patch } : slide,
        ),
      },
    });
  }
  function addSlide() {
    if (config.slides.length >= 8) return;
    onChange({
      ...block,
      config: {
        ...config,
        slides: [
          ...config.slides,
          {
            id: createId(),
            title: "หัวข้อแบนเนอร์ใหม่",
            description: "เพิ่มรายละเอียดของแบนเนอร์",
            imageId: null,
            focalPoint: { x: 50, y: 50 },
            zoom: 100,
            imageInteraction: { kind: "none" },
            action: null,
          },
        ],
      },
    });
  }
  function removeSlide(id: string) {
    if (config.slides.length <= 1) return;
    onChange({
      ...block,
      config: {
        ...config,
        slides: config.slides.filter((slide) => slide.id !== id),
      },
    });
  }
  function changeMode(mode: "single" | "slider") {
    const slides =
      mode === "slider" && config.slides.length === 1
        ? [
            ...config.slides,
            {
              id: createId(),
              title: "หัวข้อแบนเนอร์ใหม่",
              description: "เพิ่มรายละเอียดของแบนเนอร์",
              imageId: null,
              focalPoint: { x: 50, y: 50 },
              zoom: 100,
              imageInteraction: { kind: "none" as const },
              action: null,
            },
          ]
        : config.slides;
    onChange({
      ...block,
      config: {
        ...config,
        mode,
        slides,
        autoplay: mode === "slider" ? config.autoplay : false,
      },
    });
  }
  return (
    <div className="slider-settings">
      <div className="block-display-settings banner-type-settings">
        <IconChoiceField
          label="ประเภทแบนเนอร์"
          value={config.mode}
          onChange={changeMode}
          options={[
            {
              value: "single",
              label: "แบนเนอร์ปกติ",
              caption: "ปกติ",
              icon: <Monitor size={22} />,
            },
            {
              value: "slider",
              label: "แบนเนอร์สไลด์หลายภาพ",
              caption: "สไลด์",
              icon: <GalleryHorizontal size={22} />,
            },
          ]}
        />
      </div>
      <div className="block-display-settings banner-presentation-settings">
        <IconChoiceField
          label="รูปแบบแบนเนอร์"
          value={config.presentation}
          onChange={(presentation) =>
            onChange({
              ...block,
              config: {
                ...config,
                presentation,
                height:
                  presentation === "imageOnly"
                    ? "auto"
                    : config.height === "auto"
                      ? "standard"
                      : config.height,
              },
            })
          }
          options={[
            { value: "content", label: "ข้อความและภาพ", icon: <Columns2 size={22} /> },
            { value: "imageOnly", label: "เฉพาะภาพ", icon: <ImageIcon size={22} /> },
          ]}
        />
      </div>
      {config.presentation === "content" ? (
        <BannerContentPositionField
          value={config.contentPosition}
          onChange={(contentPosition) =>
            onChange({
              ...block,
              config: { ...config, contentPosition },
            })
          }
        />
      ) : null}
      <BannerHeightField
        value={config.height}
        onChange={(height) =>
          onChange({ ...block, config: { ...config, height } })
        }
      />
      {config.mode === "slider" ? <div className="banner-autoplay-settings">
        <label className="settings-toggle banner-autoplay-switch">
          <span>เลื่อนสไลด์อัตโนมัติ</span>
          <input
            type="checkbox"
            role="switch"
            checked={config.autoplay}
            aria-label="เลื่อนสไลด์อัตโนมัติ"
            onChange={(event) => onChange({ ...block, config: { ...config, autoplay: event.target.checked } })}
          />
        </label>
        <div className="block-display-settings banner-interval-settings">
          <IconChoiceField
            label="ระยะเวลาแต่ละสไลด์"
            value={String(config.intervalSeconds) as "3" | "5" | "7"}
            disabled={!config.autoplay}
            onChange={(seconds) => onChange({ ...block, config: { ...config, intervalSeconds: Number(seconds) as 3 | 5 | 7 } })}
            options={[
              { value: "3", label: "3 วินาที", caption: "3 วิ", icon: <Clock3 size={20}/> },
              { value: "5", label: "5 วินาที", caption: "5 วิ", icon: <Clock5 size={20}/> },
              { value: "7", label: "7 วินาที", caption: "7 วิ", icon: <Clock7 size={20}/> },
            ]}
          />
        </div>
      </div> : null}
      <div className="slider-settings-bar">
        <strong>{config.mode === "slider" ? `สไลด์ (${config.slides.length}/8)` : "เนื้อหาแบนเนอร์"}</strong>
        {config.mode === "slider" ? (
        <button
          type="button"
          onClick={addSlide}
          disabled={config.slides.length >= 8}
        >
          <Plus size={13} />
          เพิ่มสไลด์
        </button>
        ) : null}
      </div>
      <Droppable droppableId={`slides-${block.id}`} type="banner-slide">
        {(provided) => (
          <div
            className="news-tabs-settings-list banner-slides-settings-list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {(config.mode === "single" ? config.slides.slice(0, 1) : config.slides).map((slide, index) => {
              return (
                <Draggable
                  key={slide.id}
                  draggableId={`slide-${slide.id}`}
                  index={index}
                >
                  {(drag, snapshot) => (
                    <details
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className={snapshot.isDragging ? "dragging" : ""}
                    >
                        <summary className="news-tab-setting-header">
                          <span
                            {...drag.dragHandleProps}
                            title="ลากเพื่อจัดลำดับ"
                            onClick={(event) => event.preventDefault()}
                          >
                            <GripVertical size={15} />
                          </span>
                          <strong>สไลด์ที่ {index + 1}</strong>
                          <small>{slide.title}</small>
                          <ChevronDown size={15}/>
                        </summary>
                        <div className="news-tab-settings-body">
                          <BannerImageFrameEditor
                            mediaId={slide.imageId}
                            source={slide}
                            focalPoint={slide.focalPoint}
                            zoom={slide.zoom ?? 100}
                            onChange={(value) => updateSlide(slide.id, value)}
                            onPick={() => setPickerSlideId(slide.id)}
                          />
                          <MediaInteractionSettings
                            value={slide.imageInteraction}
                            onChange={(imageInteraction) =>
                              updateSlide(slide.id, { imageInteraction })
                            }
                          />
                          <Field
                            label={
                              config.presentation === "imageOnly"
                                ? "คำอธิบายภาพ"
                                : "หัวเรื่อง"
                            }
                          >
                            <input
                              value={slide.title}
                              onChange={(event) =>
                                updateSlide(slide.id, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </Field>
                          {config.presentation === "content" ? (
                            <Field label="คำอธิบาย">
                              <textarea
                                rows={3}
                                value={slide.description}
                                placeholder="เพิ่มคำอธิบายสั้น ๆ ของแบนเนอร์"
                                onChange={(event) =>
                                  updateSlide(slide.id, {
                                    description: event.target.value,
                                  })
                                }
                              />
                            </Field>
                          ) : null}
                          <button
                            type="button"
                            className="remove-slide"
                            disabled={config.slides.length <= 1}
                            onClick={() => setPendingSlideDeleteId(slide.id)}
                          >
                            <Trash2 size={13} />
                            ลบสไลด์
                          </button>
                        </div>
                    </details>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {pickerSlideId ? (
        <MediaPicker
          open
          currentId={
            config.slides.find((slide) => slide.id === pickerSlideId)
              ?.imageId ?? null
          }
          onClose={() => setPickerSlideId(null)}
          onSelect={(media, alt) => {
            updateSlide(pickerSlideId, {
              imageId: media.id,
              title: alt || media.alt,
            });
            setPickerSlideId(null);
          }}
        />
      ) : null}
      {pendingSlideDeleteId !== null ? <SystemConfirmDialog
        title="ลบสไลด์นี้?"
        description={`สไลด์ “${config.slides.find((slide) => slide.id === pendingSlideDeleteId)?.title || "ไม่มีชื่อ"}” และข้อมูลภายในสไลด์จะถูกลบออกจากแบนเนอร์`}
        confirmLabel="ลบสไลด์"
        onClose={() => setPendingSlideDeleteId(null)}
        onConfirm={() => {
          if (pendingSlideDeleteId) removeSlide(pendingSlideDeleteId);
          setPendingSlideDeleteId(null);
        }}
      /> : null}
    </div>
  );
}
function BannerImageFrameEditor({
  source,
  focalPoint,
  zoom,
  onChange,
  onPick,
}: {
  mediaId: string | null;
  source: unknown;
  focalPoint: { x: number; y: number };
  zoom: number;
  onChange: (value: { focalPoint?: { x: number; y: number }; zoom?: number }) => void;
  onPick: () => void;
}) {
  const media = displayMediaFor(source, "imageId");
  const drag = useRef<{ id: number; x: number; y: number; focus: { x: number; y: number } } | null>(null);
  const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!media || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, focus: focalPoint };
  }
  function moveImage(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(1, zoom / 100);
    onChange({ focalPoint: {
      x: clamp(start.focus.x - ((event.clientX - start.x) / bounds.width) * 100 / scale),
      y: clamp(start.focus.y - ((event.clientY - start.y) / bounds.height) * 100 / scale),
    } });
  }
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  return (
    <div className={`banner-frame-editor ${media ? "has-image" : ""}`}>
      <div
        className="banner-frame-viewport"
        onPointerDown={startDrag}
        onPointerMove={moveImage}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        {media ? <span style={{
          ...mediaPreviewStyle(media),
          backgroundPosition: `${focalPoint.x}% ${focalPoint.y}%`,
          transform: `scale(${zoom / 100})`,
          transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
        }} /> : <GalleryHorizontal size={28} />}
        {media ? <i><Move size={14}/> ลากเพื่อเลื่อนรูป</i> : null}
      </div>
      <div className="banner-frame-file">
        <span title={media?.name}>{media?.name ?? "ยังไม่ได้เลือกรูปภาพ"}</span>
        <button type="button" onClick={onPick}>เลือกจากคลังสื่อ</button>
      </div>
      {media ? <div className="banner-frame-zoom">
        <div><span>ซูมรูป <output>{zoom}%</output></span><button type="button" onClick={() => onChange({ focalPoint: { x: 50, y: 50 }, zoom: 100 })}><RotateCcw size={13}/>คืนค่า</button></div>
        <label><ZoomOut size={16}/><input type="range" min="100" max="300" step="1" value={zoom} aria-label="ซูมรูปแบนเนอร์" onChange={(event) => onChange({ zoom: Number(event.target.value) })}/><ZoomIn size={16}/></label>
      </div> : null}
    </div>
  );
}

function BannerFocalSetting({ source, focalPoint, onChange }: {
  mediaId: string | null;
  source: unknown;
  focalPoint: { x: number; y: number };
  onChange: (value: { x: number; y: number }) => void;
}) {
  const media = displayMediaFor(source, "imageId");
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.type === "pointermove" && event.buttons !== 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onChange({
      x: Math.round(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))),
      y: Math.round(Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))),
    });
  }
  return <div className="image-focal-setting banner-focal-setting">
    <span>ลากเพื่อเลือกบริเวณสำคัญของภาพ</span>
    <div style={{ ...mediaPreviewStyle(media), backgroundPosition: `${focalPoint.x}% ${focalPoint.y}%` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }} onPointerMove={move}>
      <i style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }} />
    </div>
    <small>จุดโฟกัส {focalPoint.x}% × {focalPoint.y}%</small>
  </div>;
}

function ImageBlockSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "image" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [picker, setPicker] = useState(false);
  const entityTargets = useLinkEntityTargets();
  const media = displayMediaFor(block.config);
  return (
    <>
      <div className="block-display-settings image-presentation-settings">
        <IconChoiceField
          label="รูปแบบการแสดงผล"
          value={block.config.mode}
          onChange={(mode) => onChange({ ...block, config: { ...block.config, mode } })}
          options={[
            { value: "image", label: "รูปภาพ", icon: <ImageIcon size={22}/> },
            { value: "imageText", label: "รูปภาพ/ข้อความ", icon: <Columns2 size={22}/> },
          ]}
        />
      </div>
      <MediaField mediaId={block.config.mediaId} source={block.config} onPick={() => setPicker(true)} previewFit="contain" className="image-block-media-field" />
      <Field label="หัวข้อ">
        <input
          value={block.config.title}
          placeholder="หัวข้อเหนือรูปภาพ (ไม่บังคับ)"
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, title: event.target.value },
            })
          }
        />
      </Field>
      <Field label={block.config.mode === "imageText" ? "เนื้อหา" : "คำอธิบาย"}>
        {block.config.mode === "imageText" ? <SecondaryRichTextEditor
          value={block.config.description}
          announcementStyle
          onChange={(description) => onChange({ ...block, config: { ...block.config, description } })}
          compact
        /> : <textarea
          rows={3}
          value={block.config.description}
          placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
          onChange={(event) => onChange({ ...block, config: { ...block.config, description: event.target.value } })}
        />}
      </Field>
      {block.config.mode === "image" ? <>
        <div className="block-display-settings image-size-settings">
          <IconChoiceField
            label="ขนาดภาพ"
            value={block.config.imageSize}
            onChange={(imageSize) => onChange({ ...block, config: { ...block.config, imageSize } })}
            options={[
              { value: "small", label: "เล็ก", icon: <span className="image-size-choice is-small" /> },
              { value: "medium", label: "กลาง", icon: <span className="image-size-choice is-medium" /> },
              { value: "large", label: "ใหญ่", icon: <span className="image-size-choice is-large" /> },
              { value: "full", label: "เต็มพื้นที่", icon: <span className="image-size-choice is-full" /> },
            ]}
          />
        </div>
        <div className="block-display-settings image-align-settings">
          <IconChoiceField
            label="ตำแหน่งภาพ"
            value={block.config.imageAlign}
            onChange={(imageAlign) => onChange({ ...block, config: { ...block.config, imageAlign } })}
            options={[
              { value: "left", label: "ชิดซ้าย", icon: <AlignLeft size={22}/> },
              { value: "center", label: "กึ่งกลาง", icon: <AlignCenter size={22}/> },
              { value: "right", label: "ชิดขวา", icon: <AlignRight size={22}/> },
            ]}
          />
        </div>
      </> : <>
        <div className="block-display-settings image-text-display-settings">
          <IconChoiceField
            label="การแสดงภาพ"
            value={block.config.imageTextDisplay}
            onChange={(imageTextDisplay) => onChange({ ...block, config: { ...block.config, imageTextDisplay, ...(imageTextDisplay === "crop" ? { fit: "cover" as const, aspectRatio: block.config.aspectRatio === "original" ? "4:3" as const : block.config.aspectRatio } : {}) } })}
            options={[
              { value: "natural", label: "แสดงเต็มรูป", icon: <ImageIcon size={22}/> },
              { value: "crop", label: "ครอบเต็มกรอบ", icon: <GalleryHorizontal size={22}/> },
            ]}
          />
        </div>
        <div className="block-display-settings image-text-split-settings">
          <IconChoiceField
            label="สัดส่วนพื้นที่"
            value={block.config.imageTextSplit}
            onChange={(imageTextSplit) => onChange({ ...block, config: { ...block.config, imageTextSplit } })}
            options={[
              { value: "40-60", label: "รูป 40% / ข้อความ 60%", caption: "รูป 40%", icon: <span className="image-text-split-choice is-40-60"><i/><i/></span> },
              { value: "50-50", label: "เท่ากัน 50% / 50%", caption: "เท่ากัน", icon: <span className="image-text-split-choice is-50-50"><i/><i/></span> },
              { value: "60-40", label: "รูป 60% / ข้อความ 40%", caption: "รูป 60%", icon: <span className="image-text-split-choice is-60-40"><i/><i/></span> },
            ]}
          />
        </div>
        {block.config.imageTextDisplay === "crop" ? <ImageDisplaySettings
          config={block.config}
          cropOnly
          onChange={(change) => onChange({ ...block, config: { ...block.config, ...change } })}
        /> : null}
      </>}
      <MediaInteractionSettings
        value={block.config.imageInteraction}
        onChange={(imageInteraction) =>
          onChange({
            ...block,
            config: { ...block.config, imageInteraction },
          })
        }
      />
      {block.config.mode === "imageText" ? <>
        <div className="block-display-settings image-position-settings"><IconChoiceField label="ตำแหน่งรูป" value={block.config.imagePosition} onChange={(imagePosition) => onChange({ ...block, config: { ...block.config, imagePosition } })} options={[
          { value: "left", label: "รูปด้านซ้าย", icon: <span className="image-position-choice is-left"><i/><b/></span> },
          { value: "right", label: "รูปด้านขวา", icon: <span className="image-position-choice is-right"><i/><b/></span> },
        ]}/></div>
        <div className="block-display-settings image-text-align-settings"><IconChoiceField label="ตำแหน่งชุดข้อความ" value={block.config.verticalAlign} onChange={(verticalAlign) => onChange({ ...block, config: { ...block.config, verticalAlign } })} options={[
          { value: "top", label: "ด้านบน", icon: <span className="image-text-align-choice is-top"><i/></span> },
          { value: "center", label: "กึ่งกลาง", icon: <span className="image-text-align-choice is-center"><i/></span> },
          { value: "bottom", label: "ด้านล่าง", icon: <span className="image-text-align-choice is-bottom"><i/></span> },
        ]}/></div>
        <label className="settings-toggle image-link-toggle"><span>แสดงปุ่มลิงก์</span><input type="checkbox" role="switch" checked={block.config.action !== null} onChange={(event) => onChange({ ...block, config: { ...block.config, action: event.target.checked ? { label: "ดูรายละเอียด", target: { kind: "module", module: "home" }, openInNewTab: false } : null } })}/></label>
        {block.config.action ? <>
          <Field label="ข้อความปุ่ม"><input value={block.config.action.label} onChange={(event) => onChange({ ...block, config: { ...block.config, action: block.config.action ? { ...block.config.action, label: event.target.value } : null } })}/></Field>
          <LinkTargetFields target={block.config.action.target} entityTargets={entityTargets} onChange={(target) => onChange({ ...block, config: { ...block.config, action: block.config.action ? { ...block.config.action, target } : null } })}/>
          <label className="settings-toggle image-link-toggle"><span>เปิดในแท็บใหม่</span><input type="checkbox" role="switch" checked={block.config.action.openInNewTab} onChange={(event) => onChange({ ...block, config: { ...block.config, action: block.config.action ? { ...block.config.action, openInNewTab: event.target.checked } : null } })}/></label>
        </> : null}
      </> : null}
      {picker ? (
        <MediaPicker
          open
          currentId={media?.id ?? null}
          onClose={() => setPicker(false)}
          onSelect={(item) => {
            onChange({
              ...block,
              config: { ...block.config, mediaId: item.id, alt: item.name, caption: "" },
            });
            setPicker(false);
          }}
        />
      ) : null}
    </>
  );
}
function ImageTextSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "imageText" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [picker, setPicker] = useState(false);
  const entityTargets = useLinkEntityTargets();
  return (
    <>
      <MediaField
        mediaId={block.config.imageId}
        source={block.config}
        onPick={() => setPicker(true)}
      />
      <Field label="หัวเรื่อง">
        <input
          value={block.config.title}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, title: event.target.value },
            })
          }
        />
      </Field>
      <Field label="เนื้อหา">
        <SecondaryRichTextEditor
          value={block.config.body}
          announcementStyle
          onChange={(body) =>
            onChange({
              ...block,
              config: { ...block.config, body },
            })
          }
        />
      </Field>
      <label className="settings-toggle">
        <span>แสดงปุ่มลิงก์</span>
        <input
          type="checkbox"
          checked={block.config.action !== null}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                action: event.target.checked
                  ? {
                      label: "ดูรายละเอียด",
                      target: { kind: "module", module: "home" },
                      openInNewTab: false,
                    }
                  : null,
              },
            })
          }
        />
      </label>
      {block.config.action ? (
        <>
          <Field label="ข้อความปุ่ม">
            <input
              value={block.config.action.label}
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    action: block.config.action
                      ? {
                          ...block.config.action,
                          label: event.target.value,
                        }
                      : null,
                  },
                })
              }
            />
          </Field>
          <LinkTargetFields
            target={block.config.action.target}
            entityTargets={entityTargets}
            onChange={(target) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  action: block.config.action
                    ? { ...block.config.action, target }
                    : null,
                },
              })
            }
          />
          <label className="settings-toggle">
            <span>เปิดในแท็บใหม่</span>
            <input
              type="checkbox"
              checked={block.config.action.openInNewTab}
              onChange={(event) =>
                onChange({
                  ...block,
                  config: {
                    ...block.config,
                    action: block.config.action
                      ? {
                          ...block.config.action,
                          openInNewTab: event.target.checked,
                        }
                      : null,
                  },
                })
              }
            />
          </label>
        </>
      ) : null}
      <Field label="ตำแหน่งรูป">
        <NativeSelect
          value={block.config.imagePosition}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                imagePosition: event.target.value as "left" | "right",
              },
            })
          }
        >
          <option value="left">รูปด้านซ้าย</option>
          <option value="right">รูปด้านขวา</option>
        </NativeSelect>
      </Field>
      <Field label="ตำแหน่งชุดข้อความ">
        <NativeSelect
          value={block.config.verticalAlign}
          onChange={(event) =>
            onChange({
              ...block,
              config: {
                ...block.config,
                verticalAlign: event.target.value as
                  "top" | "center" | "bottom",
              },
            })
          }
        >
          <option value="top">ด้านบน</option>
          <option value="center">กึ่งกลาง</option>
          <option value="bottom">ด้านล่าง</option>
        </NativeSelect>
      </Field>
      {picker ? (
        <MediaPicker
          open
          currentId={block.config.imageId}
          onClose={() => setPicker(false)}
          onSelect={(item) => {
            onChange({
              ...block,
              config: { ...block.config, imageId: item.id },
            });
            setPicker(false);
          }}
        />
      ) : null}
    </>
  );
}

type LinkEntityTarget = {
  id: string;
  label: string;
  entity: "page" | "unit";
  path: string;
};

const linkModules = selectableModuleRoutes;

function useLinkEntityTargets() {
  const [targets, setTargets] = useState<LinkEntityTarget[]>([]);
  useEffect(() => {
    const refresh = () =>
      setTargets([
        ...readPageSummaries()
          .filter((page) => !page.locked)
          .map((page) => ({
            id: page.id,
            label: page.name,
            entity: "page" as const,
            path: `/${page.path}`,
          })),
        ...readUnits().map((unit) => ({
          id: unit.id,
          label: unit.shortName || unit.name,
          entity: "unit" as const,
          path: `/units/${unit.slug}`,
        })),
      ]);
    refresh();
    window.addEventListener(pagesChangeEvent, refresh);
    window.addEventListener("hos-units-change", refresh);
    void refreshPageSummaries().catch(() => undefined);
    void refreshUnits().catch(() => undefined);
    return () => {
      window.removeEventListener(pagesChangeEvent, refresh);
      window.removeEventListener("hos-units-change", refresh);
    };
  }, []);
  return targets;
}

function LinkTargetFields({
  target,
  entityTargets,
  onChange,
}: {
  target: LinkTarget;
  entityTargets: LinkEntityTarget[];
  onChange: (target: LinkTarget) => void;
}) {
  return (
    <>
      <Field label="ประเภทปลายทาง">
        <NativeSelect
          value={target.kind}
          onChange={(event) => {
            const kind = event.target.value;
            const firstEntity = entityTargets[0];
            onChange(
              kind === "external"
                ? { kind: "external", url: "https://" }
                : kind === "entity" && firstEntity
                  ? {
                      kind: "entity",
                      entity: firstEntity.entity,
                      id: firstEntity.id,
                    }
                  : { kind: "module", module: "home" },
            );
          }}
        >
          <option value="module">ส่วนหลักของเว็บไซต์</option>
          <option value="entity" disabled={entityTargets.length === 0}>
            หน้าเว็บไซต์หรือหน่วยงาน
          </option>
          <option value="external">เว็บไซต์ภายนอก</option>
        </NativeSelect>
      </Field>
      {target.kind === "external" ? (
        <Field label="URL ภายนอก">
          <input
            value={target.url}
            onChange={(event) =>
              onChange({ kind: "external", url: event.target.value })
            }
            placeholder="https://example.com"
          />
        </Field>
      ) : target.kind === "module" ? (
        <Field label="หน้าปลายทาง">
          <NativeSelect
            value={target.module}
            onChange={(event) =>
              onChange({
                kind: "module",
                module: event.target.value as Extract<
                  LinkTarget,
                  { kind: "module" }
                >["module"],
              })
            }
          >
            {!moduleRouteCatalog[target.module].selectable ? (
              <option value={target.module} disabled>{moduleRouteCatalog[target.module].label} (ปลายทางเดิม)</option>
            ) : null}
            {linkModules.map((module) => (
              <option value={module.value} key={module.value}>
                {module.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <Field label="หน้าเป้าหมาย">
          <AnchoredSelect
            className="entity-target-select"
            label="หน้าเป้าหมาย"
            value={`${target.entity}:${target.id}`}
            options={entityTargets.map((entry) => ({
              value: `${entry.entity}:${entry.id}`,
              label: entry.label,
              description: entry.path,
              group: entry.entity === "page" ? "หน้าเว็บไซต์" : "หน่วยงานและกลุ่มงาน",
            }))}
            onChange={(value) => {
              const selected = entityTargets.find(
                (entry) => `${entry.entity}:${entry.id}` === value,
              );
              if (selected)
                onChange({
                  kind: "entity",
                  entity: selected.entity,
                  id: selected.id,
                });
            }}
          />
        </Field>
      )}
    </>
  );
}

function MediaInteractionSettings({
  value,
  onChange,
}: {
  value: MediaInteraction;
  onChange: (value: MediaInteraction) => void;
}) {
  const entityTargets = useLinkEntityTargets();
  return (
    <div className="media-interaction-settings">
      <div className="block-display-settings media-interaction-kind-settings">
        <IconChoiceField
          label="เมื่อคลิกภาพ"
          value={value.kind}
          onChange={(kind) => onChange(
            kind === "lightbox"
              ? { kind: "lightbox" }
              : kind === "link"
                ? { kind: "link", target: { kind: "module", module: "home" }, openInNewTab: false }
                : { kind: "none" },
          )}
          options={[
            { value: "none", label: "ไม่ทำอะไร", caption: "ไม่ทำอะไร", icon: <Ban size={20}/> },
            { value: "lightbox", label: "เปิดดูภาพขนาดใหญ่", caption: "ดูภาพใหญ่", icon: <ImageIcon size={20}/> },
            { value: "link", label: "เปิดลิงก์", caption: "เปิดลิงก์", icon: <Link2 size={20}/> },
          ]}
        />
      </div>
      {value.kind === "link" ? (
        <>
          <LinkTargetFields
            target={value.target}
            entityTargets={entityTargets}
            onChange={(target) => onChange({ ...value, target })}
          />
          <div className="block-display-settings media-link-open-settings">
            <IconChoiceField
              label="รูปแบบการเปิดลิงก์"
              value={value.openInNewTab ? "new" : "same"}
              onChange={(mode) => onChange({ ...value, openInNewTab: mode === "new" })}
              options={[
                { value: "same", label: "เปิดในหน้าเดิม", caption: "หน้าเดิม", icon: <MousePointerClick size={20}/> },
                { value: "new", label: "เปิดในแท็บใหม่", caption: "แท็บใหม่", icon: <ExternalLink size={20}/> },
              ]}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function CtaSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "cta" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const entityTargets = useLinkEntityTargets();
  return (
    <>
      <Field label="หัวเรื่อง">
        <input
          value={block.config.title}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, title: event.target.value },
            })
          }
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={block.config.description}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, description: event.target.value },
            })
          }
        />
      </Field>
      <Field label="ข้อความปุ่ม">
        <input
          value={block.config.label}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, label: event.target.value },
            })
          }
        />
      </Field>
      <LinkTargetFields
        target={block.config.target}
        entityTargets={entityTargets}
        onChange={(target) =>
          onChange({
            ...block,
            config: { ...block.config, target },
          })
        }
      />
      <div className="block-display-settings cta-variant-settings">
        <IconChoiceField label="รูปแบบปุ่ม" value={block.config.variant} onChange={(variant) => onChange({ ...block, config: { ...block.config, variant } })} options={[
          { value: "solid", label: "สีหลัก", icon: <span className="cta-variant-icon solid" /> },
          { value: "outline", label: "เส้นขอบ", icon: <span className="cta-variant-icon outline" /> },
        ]} />
      </div>
    </>
  );
}
function LinksSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "links" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const entityTargets = useLinkEntityTargets();
  function update(
    index: number,
    patch: { label?: string; target?: LinkTarget },
  ) {
    const items = block.config.items.map((item, itemIndex) =>
      itemIndex === index
        ? {
            label: patch.label ?? item.label,
            target: patch.target ?? item.target,
          }
        : item,
    );
    onChange({ ...block, config: { items } });
  }
  return (
    <div className="repeatable-settings">
      {block.config.items.map((item, index) => (
        <div key={index}>
          <Field label={`ลิงก์ ${index + 1}`}>
            <input
              value={item.label}
              onChange={(event) => update(index, { label: event.target.value })}
            />
          </Field>
          <LinkTargetFields
            target={item.target}
            entityTargets={entityTargets}
            onChange={(target) => update(index, { target })}
          />
          <button
            className="remove-slide"
            onClick={() =>
              onChange({
                ...block,
                config: {
                  items: block.config.items.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                },
              })
            }
          >
            <Trash2 size={13} />
            ลบ
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            ...block,
            config: {
              items: [
                ...block.config.items,
                {
                  label: "ลิงก์ใหม่",
                  target: { kind: "module", module: "home" },
                },
              ],
            },
          })
        }
        disabled={block.config.items.length >= 12}
      >
        <Plus size={13} />
        เพิ่มลิงก์
      </button>
    </div>
  );
}
function ServiceGroupsSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "serviceGroups" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const config = block.config;
  const entityTargets = useLinkEntityTargets();
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "group"; groupId: string }
    | { kind: "link"; groupId: string; itemId: string }
    | null
  >(null);
  type Group = (typeof config.groups)[number];
  const patch = (change: Partial<typeof config>) => onChange({ ...block, config: { ...config, ...change } });
  const updateGroup = (id: string, change: Partial<Group>) => patch({ groups: config.groups.map((group) => group.id === id ? { ...group, ...change } : group) });
  const pendingGroup = pendingDelete ? config.groups.find((group) => group.id === pendingDelete.groupId) : null;
  const pendingLink = pendingDelete?.kind === "link" ? pendingGroup?.items.find((item) => item.id === pendingDelete.itemId) : null;
  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "group") {
      patch({ groups: config.groups.filter((group) => group.id !== pendingDelete.groupId) });
    } else if (pendingGroup) {
      updateGroup(pendingDelete.groupId, {
        items: pendingGroup.items.filter((item) => item.id !== pendingDelete.itemId),
      });
    }
    setPendingDelete(null);
  };
  return <>
    <Field label="หัวข้อใหญ่"><input value={config.title} onChange={(event) => patch({ title: event.target.value })} /></Field>
    <Field label="คำอธิบาย"><textarea rows={3} value={config.description} placeholder="เพิ่มคำอธิบายสั้น ๆ ของเมนูบริการ" onChange={(event) => patch({ description: event.target.value })} /></Field>
    <div className="service-group-settings">
      <div className="slider-settings-bar"><strong>หมวดบริการ ({config.groups.length}/6)</strong><button type="button" disabled={config.groups.length >= 6} onClick={() => patch({ groups: [...config.groups, { id: createId(), title: "หมวดบริการใหม่", icon: "heart-pulse", accent: "primary", items: [] }] })}><Plus size={13}/>เพิ่มหมวด</button></div>
      {config.groups.map((group, groupIndex) => <details key={group.id}>
        <summary><span>หมวด {groupIndex + 1}</span><span>{group.title}</span><ChevronDown size={15}/></summary>
        <div className="service-group-settings-body">
          <Field label="ชื่อหมวด"><input value={group.title} onChange={(event) => updateGroup(group.id, { title: event.target.value })}/></Field>
          <ServiceGroupIconPicker value={group.icon} allowNone onChange={(icon) => updateGroup(group.id, { icon })}/>
          <div className="block-display-settings service-accent-settings">
            <IconChoiceField className="service-accent-choice" label="สีขอบและไอคอน" value={group.accent} onChange={(accent) => updateGroup(group.id, { accent })} options={[
              { value: "primary", label: "สีหลัก", caption: "สีหลัก", icon: <span className="block-accent-icon primary"/> },
              { value: "secondary", label: "สีรอง", caption: "สีรอง", icon: <span className="block-accent-icon secondary"/> },
              { value: "accent", label: "สีเน้น", caption: "สีเน้น", icon: <span className="block-accent-icon accent"/> },
            ]}/>
          </div>
          <div className="slider-settings-bar"><strong>รายการลิงก์ ({group.items.length}/8)</strong><button type="button" disabled={group.items.length >= 8} onClick={() => updateGroup(group.id, { items: [...group.items, { id: createId(), label: "ลิงก์ใหม่", target: { kind: "module", module: "home" }, openInNewTab: false }] })}><Plus size={13}/>เพิ่มลิงก์</button></div>
          <Droppable droppableId={`service-links:${block.id}:${group.id}`} type="service-link">
            {(provided) => <div className="service-link-sortable" ref={provided.innerRef} {...provided.droppableProps}>
              {group.items.map((item, itemIndex) => <Draggable draggableId={`service-link:${item.id}`} index={itemIndex} key={item.id}>
                {(drag, snapshot) => <details ref={drag.innerRef} {...drag.draggableProps} className={`service-link-setting${snapshot.isDragging ? " dragging" : ""}`}>
                  <summary className="service-link-setting-head"><span {...drag.dragHandleProps} onClick={(event) => event.preventDefault()} aria-label="ลากเพื่อจัดลำดับลิงก์" title="ลากเพื่อจัดลำดับ"><GripVertical size={15}/></span><strong>ลิงก์ {itemIndex + 1}</strong><em>{item.label}</em><ChevronDown size={15}/></summary>
                  <div className="service-link-setting-body">
                    <Field label="ชื่อลิงก์"><input value={item.label} onChange={(event) => updateGroup(group.id, { items: group.items.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry) })}/></Field>
                    <LinkTargetFields target={item.target} entityTargets={entityTargets} onChange={(target) => updateGroup(group.id, { items: group.items.map((entry) => entry.id === item.id ? { ...entry, target } : entry) })}/>
                    <label className="settings-toggle banner-autoplay-switch"><span>เปิดในแท็บใหม่</span><input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateGroup(group.id, { items: group.items.map((entry) => entry.id === item.id ? { ...entry, openInNewTab: event.target.checked } : entry) })}/></label>
                    <button type="button" className="remove-slide" onClick={() => setPendingDelete({ kind: "link", groupId: group.id, itemId: item.id })}><Trash2 size={13}/>ลบลิงก์</button>
                  </div>
                </details>}
              </Draggable>)}
              {provided.placeholder}
            </div>}
          </Droppable>
          <button type="button" className="remove-slide" disabled={config.groups.length <= 1} onClick={() => setPendingDelete({ kind: "group", groupId: group.id })}><Trash2 size={13}/>ลบหมวด</button>
        </div>
      </details>)}
    </div>
    {pendingDelete ? <SystemConfirmDialog
      title={pendingDelete.kind === "group" ? "ลบหมวดบริการนี้?" : "ลบลิงก์นี้?"}
      description={pendingDelete.kind === "group"
        ? `หมวด “${pendingGroup?.title || "ไม่มีชื่อ"}” และรายการลิงก์ทั้งหมดภายในจะถูกลบออกจากบล็อกเมนูบริการแบบกลุ่ม`
        : `ลิงก์ “${pendingLink?.label || "ไม่มีชื่อ"}” จะถูกลบออกจากหมวด “${pendingGroup?.title || "ไม่มีชื่อ"}”`}
      confirmLabel={pendingDelete.kind === "group" ? "ลบหมวด" : "ลบลิงก์"}
      onClose={() => setPendingDelete(null)}
      onConfirm={confirmDelete}
    /> : null}
  </>;
}

function ServiceGroupIconPicker({ value, onChange, allowNone = false, ariaLabel = "เลือกไอคอนหมวดบริการ" }: { value: NavigationIconName | null; onChange: (value: NavigationIconName | null) => void; allowNone?: boolean; ariaLabel?: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOutside);
    const stopDismissal = listenForDropdownDismissal(
      () => detailsRef.current?.querySelector(".navigation-icon-grid"),
      (target) => target instanceof Node && Boolean(detailsRef.current?.contains(target)),
      () => detailsRef.current?.removeAttribute("open"),
    );
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      stopDismissal();
    };
  }, []);
  return <div className="navigation-icon-field service-group-icon-field">
    <span>ไอคอน</span>
    <details ref={detailsRef} className="navigation-icon-picker" onKeyDown={(event) => {
      if (event.key === "Escape") { detailsRef.current?.removeAttribute("open"); detailsRef.current?.querySelector("summary")?.focus(); }
    }}>
      <summary><span>{value ? <NavigationIcon name={value} size={18}/> : <X size={18}/>}{value ? navigationIcons[value].label : "ไม่มี"}</span><ChevronDown size={17}/></summary>
      <div className="navigation-icon-grid" aria-label={ariaLabel}>
        {allowNone ? <button type="button" className={value === null ? "selected" : ""} aria-label="ไม่มีไอคอน" aria-pressed={value === null} title="ไม่มีไอคอน" onClick={() => { onChange(null); detailsRef.current?.removeAttribute("open"); }}><X size={21}/><small>ไม่มี</small></button> : null}
        {navigationIconNames.map((name) => <button key={name} type="button" className={value === name ? "selected" : ""} aria-label={navigationIcons[name].label} aria-pressed={value === name} title={navigationIcons[name].label} onClick={() => { onChange(name); detailsRef.current?.removeAttribute("open"); }}><NavigationIcon name={name} size={21}/><small>{navigationIcons[name].label}</small></button>)}
      </div>
    </details>
  </div>;
}

function LinkCardsSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "linkCards" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const config = block.config;
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const entityTargets = useLinkEntityTargets();
  type Card = (typeof config.items)[number];
  const patch = (change: Partial<typeof config>) =>
    onChange({ ...block, config: { ...config, ...change } });
  const updateCard = (id: string, next: Card) =>
    patch({
      items: config.items.map((item) => (item.id === id ? next : item)),
    });
  const itemLabel = config.presentation === "list" ? "รายการ" : "การ์ด";
  return (
    <>
      <div className="block-display-settings link-presentation-settings">
        <IconChoiceField
          label="รูปแบบลิงก์"
          value={config.presentation}
          onChange={(presentation) => patch({ presentation })}
          options={[
            { value: "list", label: "แบบรายการ", icon: <List size={20} /> },
            { value: "cards", label: "แบบการ์ด", icon: <LayoutGrid size={20} /> },
          ]}
        />
      </div>
      <Field label="หัวข้อใหญ่">
        <input
          value={config.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={config.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <div className="link-card-settings">
        <div className="slider-settings-bar">
          <strong>{itemLabel} ({config.items.length}/12)</strong>
          <button
            type="button"
            disabled={config.items.length >= 12}
            onClick={() =>
              patch({
                items: [
                  ...config.items,
                  {
                    id: createId(),
                    title: "บริการใหม่",
                    description: "",
                    visual: { kind: "icon", icon: "stethoscope" },
                    target: { kind: "module", module: "services" },
                  },
                ],
              })
            }
          >
            <Plus size={13} />
            เพิ่ม{itemLabel}
          </button>
        </div>
        <Droppable droppableId={`link-cards-${block.id}`} type="link-card">
          {(provided) => (
            <div
              className="link-card-sortable"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
        {config.items.map((item, index) => {
          const media =
            item.visual.kind === "image"
              ? displayMediaFor(item.visual)
              : null;
          return (
            <Draggable draggableId={`link-card-${item.id}`} index={index} key={item.id}>
              {(drag, snapshot) => (
            <details
              ref={drag.innerRef}
              {...drag.draggableProps}
              className={snapshot.isDragging ? "dragging" : ""}
            >
              <summary>
                <span
                  className="link-card-drag-handle"
                  {...drag.dragHandleProps}
                  onClick={(event) => event.preventDefault()}
                  title="ลากเพื่อจัดลำดับ"
                >
                  <GripVertical size={15} />
                </span>
                {itemLabel} {index + 1}
                <ChevronDown className="link-card-collapse-icon" size={15}/>
              </summary>
              <div className="link-card-setting-body">
                <Field label={`ชื่อ${itemLabel}`}>
                  <input
                    value={item.title}
                    onChange={(event) =>
                      updateCard(item.id, {
                        ...item,
                        title: event.target.value,
                      })
                    }
                  />
                </Field>
                {config.presentation === "cards" ? <Field label="ภาพประกอบ">
                  <NativeSelect
                    value={item.visual.kind}
                    onChange={(event) =>
                      updateCard(item.id, {
                        ...item,
                        visual:
                          event.target.value === "image"
                            ? {
                                kind: "image",
                                mediaId: null,
                                focalPoint: { x: 50, y: 50 },
                                zoom: 100,
                              }
                            : { kind: "icon", icon: "stethoscope" },
                      })
                    }
                  >
                    <option value="icon">ไอคอน</option>
                    <option value="image">รูปภาพ</option>
                  </NativeSelect>
                </Field> : null}
                {config.presentation === "cards" ? (
                  item.visual.kind === "icon" ? <ServiceGroupIconPicker
                    value={item.visual.icon}
                    ariaLabel="เลือกไอคอนการ์ดลิงก์"
                    onChange={(icon) => { if (icon) updateCard(item.id, { ...item, visual: { kind: "icon", icon } }); }}
                  /> : (
                  media ? <LinkCardImageEditor
                    mediaId={item.visual.mediaId}
                    source={item.visual}
                    focalPoint={item.visual.focalPoint}
                    zoom={item.visual.zoom}
                    onPick={() => setPickerId(item.id)}
                    onChange={(change) => {
                      if (item.visual.kind === "image") updateCard(item.id, { ...item, visual: { ...item.visual, ...change } });
                    }}
                  /> : <div className="banner-image-picker link-card-image-picker">
                    <div className="banner-setting-preview"><ImageIcon size={22} /></div>
                    <span>ยังไม่ได้เลือกรูปภาพ</span>
                    <button type="button" onClick={() => setPickerId(item.id)}>เลือกจากคลังสื่อ</button>
                  </div>
                  )
                ) : null}
                <LinkTargetFields
                  target={item.target}
                  entityTargets={entityTargets}
                  onChange={(target) => updateCard(item.id, { ...item, target })}
                />
                <button
                  type="button"
                  className="remove-slide"
                  disabled={config.items.length <= 1}
                  onClick={() => setPendingDeleteId(item.id)}
                >
                  <Trash2 size={13} />
                  ลบ{itemLabel}
                </button>
              </div>
            </details>
              )}
            </Draggable>
          );
        })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
      {pickerId ? (
        <MediaPicker
          open
          currentId={
            config.items.find((item) => item.id === pickerId)?.visual.kind ===
            "image"
              ? (
                  config.items.find((item) => item.id === pickerId)?.visual as {
                    kind: "image";
                    mediaId: string | null;
                  }
                ).mediaId
              : null
          }
          onClose={() => setPickerId(null)}
          onSelect={(media) => {
            const item = config.items.find((card) => card.id === pickerId);
            if (item)
              updateCard(item.id, {
                ...item,
                visual: item.visual.kind === "image"
                  ? { ...item.visual, mediaId: media.id }
                  : {
                      kind: "image",
                      mediaId: media.id,
                      focalPoint: { x: 50, y: 50 },
                      zoom: 100,
                    },
              });
            setPickerId(null);
          }}
        />
      ) : null}
      {pendingDeleteId ? <SystemConfirmDialog
        title={`ลบ${itemLabel}นี้?`}
        description={`“${config.items.find((item) => item.id === pendingDeleteId)?.title || "ไม่มีชื่อ"}” จะถูกลบออกจาก Block ลิงก์`}
        confirmLabel={`ลบ${itemLabel}`}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          patch({ items: config.items.filter((item) => item.id !== pendingDeleteId) });
          setPendingDeleteId(null);
        }}
      /> : null}
    </>
  );
}
function LinkCardImageEditor({ source, focalPoint, zoom, onChange, onPick }: {
  mediaId: string | null;
  source: unknown;
  focalPoint: { x: number; y: number };
  zoom: number;
  onChange: (change: { focalPoint?: { x: number; y: number }; zoom?: number }) => void;
  onPick: () => void;
}) {
  const media = displayMediaFor(source);
  const drag = useRef<{ id: number; x: number; y: number; focus: { x: number; y: number } } | null>(null);
  const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!media || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, focus: focalPoint };
  };
  const moveImage = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.max(1, zoom / 100);
    onChange({ focalPoint: {
      x: clamp(start.focus.x - ((event.clientX - start.x) / bounds.width) * 100 / scale),
      y: clamp(start.focus.y - ((event.clientY - start.y) / bounds.height) * 100 / scale),
    } });
  };
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="link-card-image-editor">
    <div
      className="link-card-image-viewport"
      onPointerDown={startDrag}
      onPointerMove={moveImage}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={() => { drag.current = null; }}
    >
      <span style={{
        ...mediaPreviewStyle(media),
        backgroundPosition: `${focalPoint.x}% ${focalPoint.y}%`,
        transform: `scale(${zoom / 100})`,
        transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
      }}/>
      <i><Move size={13}/>ลากเพื่อเลื่อนรูป</i>
    </div>
    <div className="link-card-image-controls">
      <div><span>ซูมรูป <output>{zoom}%</output></span><button type="button" onClick={() => onChange({ focalPoint: { x: 50, y: 50 }, zoom: 100 })}><RotateCcw size={13}/>คืนค่า</button></div>
      <label><ZoomOut size={16}/><input type="range" min="100" max="300" step="1" value={zoom} aria-label="ซูมรูปการ์ด" onChange={(event) => onChange({ zoom: Number(event.target.value) })}/><ZoomIn size={16}/></label>
      <button type="button" className="link-card-image-change" onClick={onPick}>เปลี่ยนรูป</button>
    </div>
  </div>;
}
function GallerySettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "gallery" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [picker, setPicker] = useState(false);
  return (
    <>
      <Field label="หัวข้อแกลเลอรี">
        <input
          value={block.config.title}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, title: event.target.value },
            })
          }
          placeholder="เช่น ประมวลภาพกิจกรรม"
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={block.config.description}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, description: event.target.value },
            })
          }
        />
      </Field>
      <div className="block-display-settings gallery-settings-options">
        <IconChoiceField label="รูปแบบการแสดงผล" value={block.config.layout} onChange={(layout) => onChange({ ...block, config: { ...block.config, layout, columns: layout === "slider" ? 4 : block.config.columns } })} options={[
          { value: "grid", label: "ตารางภาพ", caption: "ตาราง", icon: <LayoutGrid size={20} /> },
          { value: "slider", label: "สไลด์ภาพ", caption: "สไลด์", icon: <GalleryHorizontal size={20} /> },
        ]} />
      </div>
      <div className="block-display-settings gallery-settings-options">
        <IconChoiceField label={block.config.layout === "slider" ? "จำนวนภาพที่แสดงต่อแถว" : "จำนวนคอลัมน์"} value={block.config.layout === "slider" ? "4" : String(block.config.columns)} onChange={(columns) => onChange({ ...block, config: { ...block.config, columns: Number(columns) as 2 | 3 | 4 } })} options={[
          { value: "2", label: "2 คอลัมน์", caption: "2 ภาพ", icon: <Columns2 size={20} />, disabled: block.config.layout === "slider" },
          { value: "3", label: "3 คอลัมน์", caption: "3 ภาพ", icon: <Columns3 size={20} />, disabled: block.config.layout === "slider" },
          { value: "4", label: "4 คอลัมน์", caption: "4 ภาพ", icon: <Columns4 size={20} /> },
        ]} />
      </div>
      {block.config.layout === "slider" ? <>
        <label className="settings-toggle block-visibility-toggle gallery-autoplay-toggle">
          <span>เลื่อนภาพอัตโนมัติ</span>
          <input
            type="checkbox"
            role="switch"
            checked={block.config.autoplay}
            onChange={(event) =>
              onChange({
                ...block,
                config: {
                  ...block.config,
                  autoplay: event.target.checked,
                },
              })
            }
          />
        </label>
        {block.config.autoplay ? <div className="block-display-settings gallery-settings-options">
          <IconChoiceField label="ระยะเวลาเปลี่ยนชุดภาพ" value={String(block.config.intervalSeconds)} onChange={(intervalSeconds) => onChange({ ...block, config: { ...block.config, intervalSeconds: Number(intervalSeconds) as 3 | 5 | 7 } })} options={[
            { value: "3", label: "ทุก 3 วินาที", caption: "3 วิ", icon: <Clock3 size={20} /> },
            { value: "5", label: "ทุก 5 วินาที", caption: "5 วิ", icon: <Clock5 size={20} /> },
            { value: "7", label: "ทุก 7 วินาที", caption: "7 วิ", icon: <Clock7 size={20} /> },
          ]} />
        </div> : null}
      </> : null}
      <div className="gallery-settings-list">
        {block.config.images.map((image, index) => {
          const media = displayMediaFor(image);
          return (
            <div key={image.mediaId}>
              <span style={mediaPreviewStyle(media)} />
              <b>{media?.name ?? `รูปที่ ${index + 1}`}</b>
              <button
                onClick={() =>
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      images: block.config.images.filter(
                        (item) => item.mediaId !== image.mediaId,
                      ),
                    },
                  })
                }
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setPicker(true)}
        disabled={block.config.images.length >= 12}
      >
        <Plus size={13} />
        เพิ่มรูปภาพ
      </button>
      {picker ? (
        <MediaPicker
          open
          currentId={null}
          onClose={() => setPicker(false)}
          onSelect={(item, alt) => {
            if (!block.config.images.some((image) => image.mediaId === item.id))
              onChange({
                ...block,
                config: {
                  ...block.config,
                  images: [...block.config.images, { mediaId: item.id, alt }],
                },
              });
            setPicker(false);
          }}
        />
      ) : null}
    </>
  );
}

function QuoteSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "quote" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const update = (patch: Partial<typeof block.config>) =>
    onChange({ ...block, config: { ...block.config, ...patch } });
  return <div className="slider-settings">
    <Field label="ข้อความเน้น"><textarea rows={4} value={block.config.text} onChange={(event) => update({ text: event.target.value })}/></Field>
    <Field label="ผู้กล่าวหรือแหล่งที่มา">
      <SecondaryRichTextEditor
        value={block.config.attribution}
        announcementStyle
        onChange={(attribution) => update({ attribution })}
        compact
      />
    </Field>
  </div>;
}

function VideoSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "video" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const update = (patch: Partial<typeof block.config>) =>
    onChange({ ...block, config: { ...block.config, ...patch } });
  return <div className="slider-settings">
    <div className="block-display-settings video-mode-settings"><IconChoiceField label="รูปแบบการแสดงผล" value={block.config.mode} onChange={(mode) => update({ mode })} options={[
      { value: "video", label: "วิดีโอเต็ม", icon: <Video size={22}/> },
      { value: "videoText", label: "วิดีโอและข้อความ", icon: <Columns2 size={22}/> },
    ]}/></div>
    <Field label="URL วิดีโอ"><input value={block.config.url} placeholder="https://www.youtube.com/watch?v=..." onChange={(event) => update({ url: event.target.value })}/></Field>
    <Field label="หัวข้อ Block"><input value={block.config.title} maxLength={160} onChange={(event) => update({ title: event.target.value })}/></Field>
    <Field label="เนื้อหา"><textarea rows={4} value={block.config.description} onChange={(event) => update({ description: event.target.value })}/></Field>
    <Field label="คำบรรยายใต้วิดีโอ"><input value={block.config.caption} onChange={(event) => update({ caption: event.target.value })}/></Field>
    {block.config.mode === "videoText" ? <>
      <div className="block-display-settings video-text-split-settings"><IconChoiceField label="สัดส่วนพื้นที่" value={block.config.videoTextSplit} onChange={(videoTextSplit) => update({ videoTextSplit })} options={[
        { value: "40-60", label: "วิดีโอ 40% / ข้อความ 60%", caption: "วิดีโอ 40%", icon: <span className="image-text-split-choice is-40-60"><i/><i/></span> },
        { value: "50-50", label: "เท่ากัน 50% / 50%", caption: "เท่ากัน", icon: <span className="image-text-split-choice is-50-50"><i/><i/></span> },
        { value: "60-40", label: "วิดีโอ 60% / ข้อความ 40%", caption: "วิดีโอ 60%", icon: <span className="image-text-split-choice is-60-40"><i/><i/></span> },
      ]}/></div>
      <div className="block-display-settings video-position-settings"><IconChoiceField label="ตำแหน่งวิดีโอ" value={block.config.videoPosition} onChange={(videoPosition) => update({ videoPosition })} options={[
        { value: "left", label: "วิดีโอด้านซ้าย", icon: <span className="image-position-choice is-left"><i/><b/></span> },
        { value: "right", label: "วิดีโอด้านขวา", icon: <span className="image-position-choice is-right"><i/><b/></span> },
      ]}/></div>
      <div className="block-display-settings video-text-align-settings"><IconChoiceField label="ตำแหน่งชุดข้อความ" value={block.config.verticalAlign} onChange={(verticalAlign) => update({ verticalAlign })} options={[
        { value: "top", label: "ด้านบน", icon: <span className="image-text-align-choice is-top"><i/></span> },
        { value: "center", label: "กึ่งกลาง", icon: <span className="image-text-align-choice is-center"><i/></span> },
        { value: "bottom", label: "ด้านล่าง", icon: <span className="image-text-align-choice is-bottom"><i/></span> },
      ]}/></div>
    </> : null}
  </div>;
}

function PdfViewerSettings({ block, onChange, hideAlignment = false }: {
  block: Extract<BuilderBlock, { type: "pdfViewer" }>;
  onChange: (block: BuilderBlock) => void;
  hideAlignment?: boolean;
}) {
  const [picker, setPicker] = useState(false);
  const update = (patch: Partial<typeof block.config>) =>
    onChange({ ...block, config: { ...block.config, ...patch } });
  const media = displayMediaFor(block.config);
  return <div className="slider-settings pdf-viewer-settings">
    <Field label="หัวข้อ Block"><input value={block.config.title} maxLength={160} placeholder="เช่น เอกสารประกอบ" onChange={(event) => update({ title: event.target.value })}/></Field>
    <Field label="ไฟล์ PDF">
      <div className="pdf-viewer-file-picker">
        {media ? <div className="pdf-viewer-selected-file"><DocumentFileIcon file={media} size={18}/><div><strong title={media.name}>{media.name}</strong></div></div> : <p>ยังไม่ได้เลือกไฟล์ PDF</p>}
        <button type="button" className="pdf-viewer-select-button" onClick={() => setPicker(true)}><Paperclip size={16}/>{media ? "เปลี่ยนไฟล์ PDF" : "เลือกไฟล์จากคลังสื่อ"}</button>
      </div>
    </Field>
    <div className="block-display-settings pdf-height-settings"><IconChoiceField label="ความสูง" value={block.config.height} onChange={(height) => update({ height })} options={[
      { value: "compact", label: "สั้น", icon: <span className="pdf-height-icon is-compact" /> },
      { value: "standard", label: "มาตรฐาน", icon: <span className="pdf-height-icon is-standard" /> },
      { value: "tall", label: "สูง", icon: <span className="pdf-height-icon is-tall" /> },
    ]} /></div>
    {!hideAlignment ? <Field label="การจัดวาง"><NativeSelect value={block.config.align} onChange={(event) => update({ align: event.target.value as typeof block.config.align })}><option value="left">ชิดซ้าย</option><option value="center">กึ่งกลาง</option><option value="right">ชิดขวา</option></NativeSelect></Field> : null}
    {picker ? <MediaPicker open acceptKind="pdf" currentId={block.config.mediaId} onClose={() => setPicker(false)} onSelect={(item) => { const useFileName = !block.config.mediaId || !block.config.title.trim() || block.config.title === "เอกสาร PDF" || block.config.title === media?.name; update({ mediaId: item.id, title: useFileName ? item.name : block.config.title }); setPicker(false); }}/>: null}
  </div>;
}

function DownloadsSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "downloads" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [picker, setPicker] = useState(false);
  const updateFiles = (files: typeof block.config.files) => onChange({ ...block, config: { ...block.config, files } });
  const updateLabel = (mediaId: string, label: string) =>
    updateFiles(block.config.files.map((file) => file.mediaId === mediaId ? { ...file, label } : file));
  return <div className="slider-settings attachment-settings">
    <Field label="หัวข้อ Block"><input value={block.config.title ?? ""} maxLength={160} placeholder="เช่น เอกสารที่เกี่ยวข้อง" onChange={(event) => onChange({ ...block, config: { ...block.config, title: event.target.value } })}/></Field>
    <div className="attachment-settings-list">
      {block.config.files.map((file) => {
        const media = displayMediaFor(file);
        const inputId = `attachment-label-${block.id}-${file.mediaId}`;
        return <div className="attachment-settings-item" key={file.mediaId}>
          <div className="attachment-settings-file">
            <DocumentFileIcon file={media} size={18} />
            <div><strong>{media?.name ?? "ไม่พบไฟล์ในคลังสื่อ"}</strong>{media ? <small>{media.size}</small> : null}</div>
            <button type="button" className="attachment-settings-remove" aria-label={`ลบไฟล์ ${file.label || media?.name || "แนบ"}`} title="ลบไฟล์แนบ" onClick={() => updateFiles(block.config.files.filter((item) => item.mediaId !== file.mediaId))}><Trash2 size={16}/></button>
          </div>
          <label className="settings-field" htmlFor={inputId}><span>ชื่อที่แสดงบนการ์ด</span><input id={inputId} value={file.label} maxLength={160} placeholder={media?.name.replace(/\.[^.]+$/, "") ?? "ชื่อไฟล์แนบ"} onChange={(event) => updateLabel(file.mediaId, event.target.value)} onBlur={(event) => { if (!event.target.value.trim()) updateLabel(file.mediaId, media?.name.replace(/\.[^.]+$/, "") ?? "ไฟล์แนบ"); }}/></label>
        </div>;
      })}
    </div>
    <button type="button" className="attachment-settings-add" onClick={() => setPicker(true)}><Paperclip size={16}/>เพิ่มไฟล์จากคลังสื่อ</button>
    <p className="attachment-settings-note">ชื่อที่แสดงแก้ไขได้ โดยไม่เปลี่ยนชื่อไฟล์ต้นฉบับในคลังสื่อ</p>
    {picker ? <MediaPicker open acceptKind="document" currentId={null} onClose={() => setPicker(false)} onSelect={(item) => { if (!block.config.files.some((file) => file.mediaId === item.id)) updateFiles([...block.config.files, { mediaId: item.id, label: item.name.replace(/\.[^.]+$/, "") }]); setPicker(false); }}/>: null}
  </div>;
}

function DocumentListCanvasTextarea({ value, onChange, placeholder, label }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={label} />;
}

export function DocumentListCanvasEditor({ config, onChange }: {
  config: BlockConfigMap["documentList"];
  onChange: (config: BlockConfigMap["documentList"]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const update = (patch: Partial<typeof config>) => onChange({ ...config, ...patch });
  const updateItemLabel = (id: string, label: string) => update({ items: config.items.map((item) => item.id === id ? { ...item, label } : item) });
  const addItem = (source: (typeof config.items)[number]["source"], label: string) => update({ items: [...config.items, { id: createId(), level: 1, number: "", label, source }] });
  const counters = [0, 0, 0];

  return <div className="document-list-canvas-editor">
    {config.title || config.description ? <header className="document-list-canvas-heading">
      {config.title ? <h2 className={`size-${config.headingSize ?? "standard"}`}>{config.title}</h2> : null}
      {config.description ? <p>{config.description}</p> : null}
    </header> : null}
    <div className="document-list-canvas-items">
      {config.items.map((item, index) => {
        const levelIndex = item.level - 1;
        for (let parent = 0; parent < levelIndex; parent += 1) if (counters[parent] === 0) counters[parent] = 1;
        counters[levelIndex] += 1;
        for (let child = levelIndex + 1; child < counters.length; child += 1) counters[child] = 0;
        const number = config.numbering === "automatic"
          ? `${config.numberPrefix ? `${config.numberPrefix}.` : ""}${counters.slice(0, item.level).join(".")}`
          : config.numbering === "manual" ? item.number : "";
        const sourceLabel = item.source?.kind === "media"
          ? `ไฟล์แนบ · ${displayMediaFor(item.source)?.name ?? "ยังไม่ได้เลือกไฟล์"}`
          : item.source?.kind === "external" ? `ลิงก์ภายนอก · ${item.source.url || "ยังไม่ได้ระบุ URL"}` : "หัวข้อไม่มีลิงก์";
        return <div className={`document-list-canvas-item level-${item.level}`} key={item.id}>
          {number ? <span className="document-list-canvas-number">{number}</span> : null}
          <div className="document-list-canvas-item-content">
            <DocumentListCanvasTextarea value={item.label} onChange={(label) => updateItemLabel(item.id, label)} placeholder={`ชื่อรายการที่ ${index + 1}`} label={`ชื่อรายการที่ ${index + 1}`} />
            <small>{sourceLabel}</small>
          </div>
        </div>;
      })}
      {config.items.length === 0 ? <p className="document-list-canvas-empty">ยังไม่มีรายการเอกสาร เพิ่มรายการเพื่อเริ่มพิมพ์ได้เลย</p> : null}
    </div>
    <div className="document-list-canvas-actions">
      <button type="button" disabled={config.items.length >= 30} onClick={() => addItem(null, "")}><Plus size={15} />เพิ่มหัวข้อ</button>
      <button type="button" disabled={config.items.length >= 30} onClick={() => setPickerOpen(true)}><Paperclip size={15} />เพิ่มไฟล์</button>
      <button type="button" disabled={config.items.length >= 30} onClick={() => addItem({ kind: "external", url: "https://" }, "")}><Link2 size={15} />เพิ่ม URL</button>
    </div>
    {pickerOpen ? <MediaPicker open acceptKind="document" currentId={null} onClose={() => setPickerOpen(false)} onSelect={(item) => {
      addItem({ kind: "media", mediaId: item.id }, item.name.replace(/\.[^.]+$/, ""));
      setPickerOpen(false);
    }} /> : null}
  </div>;
}

function DocumentListSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "documentList" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [replaceItemId, setReplaceItemId] = useState<string | null>(null);
  const config = block.config;
  const selectedSource = config.items.find((entry) => entry.id === replaceItemId)?.source;
  const update = (patch: Partial<typeof config>) => onChange({ ...block, config: { ...config, ...patch } });
  const updateItem = (id: string, patch: Partial<(typeof config.items)[number]>) =>
    update({ items: config.items.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
  const addExternal = () => update({ items: [...config.items, { id: createId(), level: 1, number: "", label: "ชื่อเอกสาร", source: { kind: "external", url: "https://" } }] });
  return <div className="slider-settings">
    <Field label="หัวข้อชุดเอกสาร"><input value={config.title} onChange={(event) => update({ title: event.target.value })}/></Field>
    <Field label="คำอธิบาย"><textarea rows={2} value={config.description} onChange={(event) => update({ description: event.target.value })}/></Field>
    <p className="block-inline-edit-hint">ชื่อรายการแก้ได้ทั้งในตั้งค่าและบนบล็อก</p>
    <Field label="การแสดงเลขข้อ"><NativeSelect value={config.numbering} onChange={(event) => update({ numbering: event.target.value as typeof config.numbering })}><option value="automatic">เรียงเลขอัตโนมัติ</option><option value="manual">กำหนดเลขเอง</option><option value="none">ไม่แสดงเลขข้อ</option></NativeSelect></Field>
    {config.numbering === "automatic" ? <Field label="เลขหัวข้อหลัก"><input value={config.numberPrefix} onChange={(event) => update({ numberPrefix: event.target.value })}/></Field> : null}
    <div className="document-list-setting-actions"><button type="button" disabled={config.items.length >= 30} onClick={() => { setReplaceItemId(null); setPicker(true); }}><Paperclip size={14}/>เพิ่มไฟล์</button><button type="button" disabled={config.items.length >= 30} onClick={addExternal}><Plus size={14}/>เพิ่ม URL</button><button type="button" disabled={config.items.length >= 30} onClick={() => update({ items: [...config.items, { id: createId(), level: 1, number: "", label: "หัวข้อ", source: null }] })}><Plus size={14}/>เพิ่มหัวข้อไม่มีลิงก์</button></div>
    <Droppable droppableId={`document-list-items-${block.id}`} type="document-list-item">
      {(provided) => <div className="document-list-settings" ref={provided.innerRef} {...provided.droppableProps}>
      {config.items.map((item, index) => <Draggable draggableId={`document-list-item-${item.id}`} index={index} key={item.id}>
        {(drag, snapshot) => <details ref={drag.innerRef} {...drag.draggableProps} className={`document-list-item-setting${snapshot.isDragging ? " dragging" : ""}`}>
        <summary className="document-list-item-heading"><span className="document-list-item-drag" {...drag.dragHandleProps} onClick={(event) => event.preventDefault()} aria-label="ลากเพื่อจัดลำดับรายการเอกสาร" title="ลากเพื่อจัดลำดับ"><GripVertical size={17}/></span><strong>{index + 1}. {item.label || "ยังไม่มีชื่อรายการ"}</strong><ChevronDown size={16}/></summary>
        <div className="document-list-item-body">
        <Field label="ชื่อรายการ"><textarea rows={3} value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })}/></Field>
        <div className="document-list-item-row">
          <Field label="ระดับรายการ"><NativeSelect value={item.level} onChange={(event) => updateItem(item.id, { level: Number(event.target.value) as typeof item.level })}><option value={1}>หัวข้อหลัก</option><option value={2}>หัวข้อย่อย</option><option value={3}>หัวข้อย่อยระดับ 3</option></NativeSelect></Field>
          {config.numbering === "manual" ? <Field label="เลขข้อ"><input value={item.number} placeholder="เช่น 1.1" onChange={(event) => updateItem(item.id, { number: event.target.value })}/></Field> : null}
        </div>
        <Field label="ปลายทาง"><NativeSelect value={item.source?.kind ?? "none"} onChange={(event) => {
          const kind = event.target.value;
          updateItem(item.id, { source: kind === "external" ? { kind: "external", url: "https://" } : kind === "media" ? { kind: "media", mediaId: "" } : null });
        }}><option value="media">ไฟล์ในคลังสื่อ</option><option value="external">URL ภายนอก</option><option value="none">หัวข้อไม่มีลิงก์</option></NativeSelect></Field>
        {item.source?.kind === "external" ? <Field label="URL"><input type="url" value={item.source.url} placeholder="https://example.com/document" onChange={(event) => updateItem(item.id, { source: { kind: "external", url: event.target.value } })}/></Field> : null}
        {item.source?.kind === "media" ? <div className="document-list-media-setting"><span>{displayMediaFor(item.source)?.name ?? "ยังไม่ได้เลือกไฟล์"}</span><button type="button" onClick={() => { setReplaceItemId(item.id); setPicker(true); }}><Paperclip size={14}/>เลือกไฟล์</button></div> : null}
        <button type="button" className="remove-slide" onClick={() => update({ items: config.items.filter((entry) => entry.id !== item.id) })}><Trash2 size={14}/>ลบรายการ</button>
        </div>
      </details>}
      </Draggable>)}
      {provided.placeholder}
    </div>}
    </Droppable>
    {picker ? <MediaPicker open acceptKind="document" currentId={selectedSource?.kind === "media" ? selectedSource.mediaId : null} onClose={() => { setPicker(false); setReplaceItemId(null); }} onSelect={(item) => { if (replaceItemId) updateItem(replaceItemId, { source: { kind: "media", mediaId: item.id } }); else update({ items: [...config.items, { id: createId(), level: 1, number: "", label: item.name.replace(/\.[^.]+$/, ""), source: { kind: "media", mediaId: item.id } }] }); setPicker(false); setReplaceItemId(null); }}/>: null}
  </div>;
}

function ScheduleSettings({ block, onChange }: {
  block: Extract<BuilderBlock, { type: "schedule" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const update = (patch: Partial<typeof block.config>) => onChange({ ...block, config: { ...block.config, ...patch } });
  return <div className="slider-settings">
    <Field label="วันที่"><input value={block.config.dateText} placeholder="เช่น 28 กันยายน 2569" onChange={(event) => update({ dateText: event.target.value })}/></Field>
    <Field label="เวลา"><input value={block.config.timeText} placeholder="เช่น 09.00–16.00 น." onChange={(event) => update({ timeText: event.target.value })}/></Field>
    <Field label="สถานที่"><input value={block.config.location} onChange={(event) => update({ location: event.target.value })}/></Field>
    <Field label="รายละเอียดเพิ่มเติม"><textarea rows={3} value={block.config.description} onChange={(event) => update({ description: event.target.value })}/></Field>
  </div>;
}

function IframeSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "iframe" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const update = (change: Partial<typeof block.config>) =>
    onChange({
      ...block,
      config: { ...block.config, ...change },
    });
  return (
    <>
      <Field label="URL ที่ต้องการฝัง">
        <input
          type="url"
          value={block.config.url}
          onChange={(event) => update({ url: event.target.value })}
          placeholder="https://example.com/embed"
        />
      </Field>
      <Field label="หัวข้อ">
        <input
          value={block.config.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="เช่น แผนที่โรงพยาบาล"
        />
      </Field>
      <Field label="คำอธิบาย">
        <input
          value={block.config.description}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="คำอธิบายสั้น ๆ (ไม่บังคับ)"
        />
      </Field>
      <div className="block-display-settings iframe-height-settings">
        <IconChoiceField label="ความสูง" value={block.config.height} onChange={(height) => update({ height })} options={[
          { value: "compact", label: "สั้น — 360px", caption: "สั้น", icon: <span className="iframe-height-icon is-compact"/> },
          { value: "standard", label: "มาตรฐาน — 520px", caption: "มาตรฐาน", icon: <span className="iframe-height-icon is-standard"/> },
          { value: "tall", label: "สูง — 720px", caption: "สูง", icon: <span className="iframe-height-icon is-tall"/> },
        ]}/>
      </div>
    </>
  );
}

function PostsSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "posts" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [units, setUnits] = useState(() => readUnits());
  const config = block.config;
  const patch = (change: Partial<typeof config>) =>
    onChange({ ...block, config: { ...config, ...change } });

  useEffect(() => {
    const refresh = () => setUnits(readUnits());
    window.addEventListener("hos-units-change", refresh);
    return () => window.removeEventListener("hos-units-change", refresh);
  }, []);

  return (
    <>
      <Field label="หัวข้อ">
        <input
          value={config.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder="เช่น ข่าวและผลงานล่าสุด"
        />
      </Field>
      <Field label="คำอธิบาย">
        <input
          value={config.description}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder="คำอธิบายสั้น ๆ (ไม่บังคับ)"
        />
      </Field>
      <Field label="เจ้าของเนื้อหา">
        <NativeSelect
          value={
            config.source.kind === "unit"
              ? config.source.unitId
              : config.source.kind
          }
          onChange={(event) =>
            patch({
              source: event.target.value === "all"
                  ? { kind: "all" }
                  : event.target.value === "hospital"
                    ? { kind: "hospital" }
                    : { kind: "unit", unitId: event.target.value },
            })
          }
        >
          <option value="all">เจ้าของเนื้อหาทั้งหมด</option>
          <option value="hospital">โรงพยาบาล</option>
          {units.map((unit) => (
            <option value={unit.id} key={unit.id}>{unit.name}</option>
          ))}
        </NativeSelect>
      </Field>
      <CategorySelect
        scope="posts"
        value={config.categoryId}
        showManageLink={false}
        onChange={(categoryId) => patch({ categoryId })}
      />
      <div className="block-display-settings posts-layout-settings">
        <IconChoiceField label="รูปแบบการแสดงผล" value={config.layout} onChange={(layout) => patch({ layout, limit: layout === config.layout ? config.limit : layout === "grid" ? 4 : 5 })} options={[
          { value: "grid", label: "แบบตาราง — หลายการ์ดต่อแถว", caption: "แบบตาราง", icon: <LayoutGrid size={21}/> },
          { value: "list", label: "แบบรายการ — หนึ่งรายการต่อแถว", caption: "แบบรายการ", icon: <List size={21}/> },
        ]}/>
      </div>
      <LimitField
        value={config.limit}
        control="select"
        label="รายการต่อหน้า"
        selectOptions={config.layout === "grid" ? [4, 8, 12] : [5, 10]}
        onChange={(limit) => patch({ limit })}
      />
    </>
  );
}

function NewsTabsSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "newsTabs" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [units, setUnits] = useState(() => readUnits());
  const config = block.config;
  const patch = (change: Partial<typeof config>) =>
    onChange({ ...block, config: { ...config, ...change } });
  const updateTab = (
    id: string,
    change: Partial<(typeof config.tabs)[number]>,
  ) =>
    patch({
      tabs: config.tabs.map((tab) =>
        tab.id === id ? { ...tab, ...change } : tab,
      ),
    });
  useEffect(() => {
    const refresh = () => setUnits(readUnits());
    window.addEventListener("hos-units-change", refresh);
    return () => window.removeEventListener("hos-units-change", refresh);
  }, []);
  return (
    <>
      <Field label="หัวข้อ">
        <input
          value={config.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={config.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <div className="news-tabs-settings-heading">
        <strong>แท็บหมวดข่าว ({config.tabs.length}/6)</strong>
        <button
          type="button"
          disabled={config.tabs.length >= 6}
          onClick={() =>
            patch({
              tabs: [
                ...config.tabs,
                {
                  id: createId(),
                  label: "หมวดข่าวใหม่",
                  source: { kind: "all" },
                  categoryId: null,
                },
              ],
            })
          }
        >
          <Plus size={13} />
          เพิ่มแท็บ
        </button>
      </div>
      <Droppable droppableId={`news-tabs-${block.id}`} type="news-tab">
        {(provided) => (
          <div
            className="news-tabs-settings-list"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {config.tabs.map((tab, index) => (
              <Draggable draggableId={`news-tab-${tab.id}`} index={index} key={tab.id}>
                {(drag, snapshot) => (
                  <details
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    className={snapshot.isDragging ? "dragging" : ""}
                  >
                    <summary className="news-tab-setting-header">
                      <span
                        {...drag.dragHandleProps}
                        title="ลากเพื่อจัดลำดับ"
                        onClick={(event) => event.preventDefault()}
                      >
                        <GripVertical size={15} />
                      </span>
                      <strong>แท็บที่ {index + 1}</strong>
                      <small>{tab.label}</small>
                      <ChevronDown size={15}/>
                    </summary>
                    <div className="news-tab-settings-body">
                    <Field label="ชื่อแท็บ">
                      <input
                        value={tab.label}
                        onChange={(event) =>
                          updateTab(tab.id, { label: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="เจ้าของเนื้อหา">
                      <NativeSelect
                        value={tab.source.kind === "unit" ? tab.source.unitId : tab.source.kind}
                        onChange={(event) => updateTab(tab.id, {
                          source: event.target.value === "all"
                            ? { kind: "all" }
                            : event.target.value === "hospital"
                              ? { kind: "hospital" }
                              : { kind: "unit", unitId: event.target.value },
                        })}
                      >
                        <option value="all">เจ้าของเนื้อหาทั้งหมด</option>
                        <option value="hospital">โรงพยาบาล</option>
                        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                      </NativeSelect>
                    </Field>
                    <CategorySelect
                      scope="posts"
                      value={tab.categoryId}
                      allowAll
                      label="หมวดข่าว"
                      showManageLink={false}
                      onChange={(categoryId) => updateTab(tab.id, { categoryId })}
                    />
                    <button
                      type="button"
                      className="remove-slide"
                      disabled={config.tabs.length <= 1}
                      onClick={() =>
                        patch({
                          tabs: config.tabs.filter((item) => item.id !== tab.id),
                        })
                      }
                    >
                      <Trash2 size={13} />
                      ลบแท็บ
                    </button>
                    </div>
                  </details>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </>
  );
}
function DocumentTabsSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "documents" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const config = block.config;
  const [units, setUnits] = useState(() => readUnits());
  const [documentYears, setDocumentYears] = useState<number[]>([]);
  useEffect(() => {
    const refresh = () => setUnits(readUnits());
    window.addEventListener("hos-units-change", refresh);
    return () => {
      window.removeEventListener("hos-units-change", refresh);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetchPublicDocumentPage({ page: 1, search: "", category: "all", unit: "all", year: "all" }, controller.signal)
      .then((result) => setDocumentYears(result.years))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const yearOptions = Array.from(new Set([
    ...documentYears,
    ...config.tabs.flatMap((tab) => typeof tab.fiscalYear === "number" ? [tab.fiscalYear] : []),
  ])).sort((left, right) => right - left);
  const patch = (change: Partial<typeof config>) =>
    onChange({ ...block, config: { ...config, ...change } });
  const updateTab = (
    id: string,
    change: Partial<(typeof config.tabs)[number]>,
  ) =>
    patch({
      tabs: config.tabs.map((tab) =>
        tab.id === id ? { ...tab, ...change } : tab,
      ),
    });
  function addTab() {
    if (config.tabs.length >= 6) return;
    patch({
      tabs: [
        ...config.tabs,
        {
          id: createId(),
          label: "แท็บเอกสารใหม่",
          source: { kind: "all" },
          categoryId: null,
          fiscalYear: "all",
        },
      ],
    });
  }
  return (
    <>
      <Field label="หัวข้อ">
        <input
          value={config.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={config.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <div className="block-display-settings document-layout-settings">
        <IconChoiceField
          label="รูปแบบการแสดงผล"
          value={config.layout}
          onChange={(layout) => patch({ layout })}
          options={[
            {
              value: "cards",
              label: "รายการการ์ด",
              caption: "การ์ด",
              icon: <ListChecks size={20} />,
            },
            {
              value: "table",
              label: "ตารางเอกสาร",
              caption: "ตาราง",
              icon: <Table2 size={20} />,
            },
          ]}
        />
      </div>
      <LimitField
        value={config.limit}
        onChange={(limit) => patch({ limit })}
        control="select"
        label="รายการต่อหน้า"
        selectOptions={[10, 15, 20]}
      />
      <div className="news-tabs-settings-heading">
        <strong>แท็บเอกสาร ({config.tabs.length}/6)</strong>
        <button
          type="button"
          disabled={config.tabs.length >= 6}
          onClick={addTab}
        >
          <Plus size={13} />
          เพิ่มแท็บ
        </button>
      </div>
      <Droppable droppableId={`document-tabs-${block.id}`} type="document-tab">
        {(provided) => (
      <div
        className="news-tabs-settings-list document-tabs-settings-list"
        ref={provided.innerRef}
        {...provided.droppableProps}
      >
        {config.tabs.map((tab, index) => (
          <Draggable draggableId={`document-tab-${tab.id}`} index={index} key={tab.id}>
            {(drag, snapshot) => (
          <details
            ref={drag.innerRef}
            {...drag.draggableProps}
            className={snapshot.isDragging ? "dragging" : ""}
          >
            <summary className="news-tab-setting-header">
              <span
                {...drag.dragHandleProps}
                title="ลากเพื่อจัดลำดับ"
                onClick={(event) => event.preventDefault()}
              >
                <GripVertical size={15}/>
              </span>
              <strong>แท็บที่ {index + 1}</strong>
              <small>{tab.label}</small>
              <ChevronDown size={15}/>
            </summary>
            <div className="document-tab-settings-body">
            <Field label="ชื่อแท็บ">
              <input
                value={tab.label}
                onChange={(event) =>
                  updateTab(tab.id, { label: event.target.value })
                }
              />
            </Field>
            <Field label="เจ้าของเนื้อหา">
              <NativeSelect
                value={tab.source.kind === "unit" ? tab.source.unitId : tab.source.kind}
                onChange={(event) => {
                  if (event.target.value === "selected") return;
                  updateTab(tab.id, {
                  source: event.target.value === "all"
                    ? { kind: "all" }
                    : event.target.value === "hospital"
                      ? { kind: "hospital" }
                      : { kind: "unit", unitId: event.target.value },
                  });
                }}
              >
                <option value="all">เจ้าของเนื้อหาทั้งหมด</option>
                <option value="hospital">โรงพยาบาล</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                {tab.source.kind === "selected" ? <option value="selected">รายการที่เลือกไว้ (รูปแบบเดิม)</option> : null}
              </NativeSelect>
            </Field>
            <CategorySelect
              scope="documents"
              value={tab.categoryId}
              allowAll
              label="หมวดหมู่เอกสาร"
              showManageLink={false}
              onChange={(categoryId) => updateTab(tab.id, { categoryId })}
            />
            <Field label="ปีงบประมาณ">
              <NativeSelect value={String(tab.fiscalYear)} onChange={(event) => updateTab(tab.id, {
                fiscalYear: event.target.value === "all" ? "all" : Number(event.target.value),
              })}>
                <option value="all">ทุกปีงบประมาณ</option>
                {yearOptions.map((year) => <option value={year} key={year}>{year}</option>)}
              </NativeSelect>
            </Field>
            <button
              type="button"
              className="remove-slide"
              disabled={config.tabs.length <= 1}
              onClick={() =>
                patch({
                  tabs: config.tabs.filter((item) => item.id !== tab.id),
                })
              }
            >
              <Trash2 size={13} />
              ลบแท็บ
            </button>
            </div>
          </details>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
        )}
      </Droppable>
    </>
  );
}
function FaqSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "faq" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  return (
    <>
      <Field label="หัวข้อ">
        <input
          value={block.config.title}
          placeholder="เช่น คำถามที่พบบ่อย"
          onChange={(event) => onChange({ ...block, config: { ...block.config, title: event.target.value } })}
        />
      </Field>
      <Field label="คำอธิบาย">
        <textarea
          rows={3}
          value={block.config.description}
          placeholder="คำอธิบายสั้น ๆ ก่อนรายการคำถาม"
          onChange={(event) => onChange({ ...block, config: { ...block.config, description: event.target.value } })}
        />
      </Field>
      <div className="faq-settings-heading">
        <strong>รายการคำถาม ({block.config.items.length}/12)</strong>
        <button
          type="button"
          disabled={block.config.items.length >= 12}
          onClick={() => {
            setExpandedIndex(block.config.items.length);
            onChange({
              ...block,
              config: {
                ...block.config,
                items: [...block.config.items, { question: "คำถามใหม่", answer: "" }],
              },
            });
          }}
        >
          <Plus size={13} />
          เพิ่มคำถาม
        </button>
      </div>
      <div className="faq-settings-list">
        {block.config.items.map((item, index) => (
          <details key={index} open={expandedIndex === index}>
            <summary
              className="faq-setting-header"
              onClick={(event) => {
                event.preventDefault();
                setExpandedIndex(expandedIndex === index ? null : index);
              }}
            >
              <span className="faq-setting-number">{index + 1}</span>
              <span className="faq-setting-preview">{item.question.trim() || `คำถามที่ ${index + 1}`}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </summary>
            <div className="faq-setting-body">
              <Field label="คำถาม">
                <input
                  value={item.question}
                  onChange={(event) =>
                    onChange({
                      ...block,
                      config: {
                        ...block.config,
                        items: block.config.items.map((value, itemIndex) =>
                          itemIndex === index ? { ...value, question: event.target.value } : value,
                        ),
                      },
                    })
                  }
                />
              </Field>
              <Field label="คำตอบ">
                <SecondaryRichTextEditor
                  value={item.answer}
                  announcementStyle
                  compact
                  onChange={(answer) =>
                    onChange({
                      ...block,
                      config: {
                        ...block.config,
                        items: block.config.items.map((value, itemIndex) =>
                          itemIndex === index ? { ...value, answer } : value,
                        ),
                      },
                    })
                  }
                />
              </Field>
              <button
                type="button"
                className="remove-slide"
                onClick={() => {
                  setExpandedIndex((current) => current === index ? null : current !== null && current > index ? current - 1 : current);
                  onChange({
                    ...block,
                    config: {
                      ...block.config,
                      items: block.config.items.filter((_, itemIndex) => itemIndex !== index),
                    },
                  });
                }}
              >
                <Trash2 size={13} />
                ลบคำถาม
              </button>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
function AlertSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "alert" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  return (
    <>
      <div className="block-display-settings alert-tone-settings">
        <IconChoiceField
          label="รูปแบบประกาศ"
          value={block.config.tone}
          onChange={(tone) =>
            onChange({
              ...block,
              config: { ...block.config, tone },
            })
          }
          options={[
            {
              value: "info",
              label: "ข้อมูล",
              icon: <span className="alert-tone-icon info"><Info size={20} /></span>,
            },
            {
              value: "success",
              label: "สำเร็จ",
              icon: <span className="alert-tone-icon success"><CheckCircle2 size={20} /></span>,
            },
            {
              value: "warning",
              label: "คำเตือน",
              icon: <span className="alert-tone-icon warning"><TriangleAlert size={20} /></span>,
            },
            {
              value: "important",
              label: "สำคัญมาก",
              icon: <span className="alert-tone-icon important"><CircleAlert size={20} /></span>,
            },
          ]}
        />
      </div>
      <Field label="หัวข้อ">
        <input
          value={block.config.title}
          onChange={(event) =>
            onChange({
              ...block,
              config: { ...block.config, title: event.target.value },
            })
          }
        />
      </Field>
      <Field label="รายละเอียด">
        <textarea
          rows={4}
          value={block.config.body}
          onChange={(event) => onChange({ ...block, config: { ...block.config, body: event.target.value } })}
        />
      </Field>
    </>
  );
}
function DividerSettings({
  block,
  onChange,
}: {
  block: Extract<BuilderBlock, { type: "divider" }>;
  onChange: (block: BuilderBlock) => void;
}) {
  return (
    <Field label="รูปแบบ">
      <NativeSelect
        value={block.config.style}
        onChange={(event) =>
          onChange({
            ...block,
            config: {
              style: event.target.value as "line" | "space",
            },
          })
        }
      >
        <option value="line">เส้นคั่น</option>
        <option value="space">ช่องว่าง</option>
      </NativeSelect>
    </Field>
  );
}
function MediaField({
  source,
  onPick,
  previewFit = "cover",
  className,
}: {
  mediaId: string | null;
  source: unknown;
  onPick: () => void;
  previewFit?: "cover" | "contain";
  className?: string;
}) {
  const media = displayMediaFor(source, "imageId") ?? displayMediaFor(source);
  return (
    <div className={`banner-image-picker${media ? " has-image" : ""}${className ? ` ${className}` : ""}`}>
      <div className="banner-setting-preview" style={{ ...mediaPreviewStyle(media), backgroundSize: previewFit }}>
        {media ? null : <ImageIcon size={22} />}
      </div>
      <span>{media?.name ?? "ยังไม่ได้เลือกรูปภาพ"}</span>
      <button type="button" onClick={onPick}>
        เลือกจากคลังสื่อ
      </button>
    </div>
  );
}
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button type="button" className={open ? "settings-section-open" : undefined} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {title}
        <ChevronDown size={14} className={open ? "" : "closed"} />
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-field" role="group" aria-label={label}>
      <span>{label}</span>
      {children}
    </div>
  );
}
const widthOptions: { value: BuilderBlock["width"]; label: string }[] = [
  { value: "narrow", label: "แคบ" },
  { value: "standard", label: "มาตรฐาน" },
  { value: "wide", label: "กว้าง" },
  { value: "full", label: "เต็มพื้นที่" },
];

function IconChoiceField<T extends string>({ label, value, onChange, options, disabled = false, className }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; caption?: string; icon: ReactNode; disabled?: boolean }[];
  disabled?: boolean;
  className?: string;
}) {
  return <div className={`block-icon-choice-field${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}>
    <span>{label}</span>
    <div className="block-icon-choice-options" role="group" aria-label={label} aria-disabled={disabled} data-count={options.length}>
      {options.map((option) => <button key={option.value} type="button" aria-label={option.label} title={option.label} aria-pressed={value === option.value} className={value === option.value ? "selected" : ""} disabled={disabled || option.disabled} onClick={() => onChange(option.value)}><span className="block-choice-visual" aria-hidden="true">{option.icon}</span><span className="block-choice-caption">{option.caption ?? option.label}</span></button>)}
    </div>
  </div>;
}

type BannerContentPosition = BlockConfigMap["bannerSlider"]["contentPosition"];
type BannerHeight = BlockConfigMap["bannerSlider"]["height"];

function BannerHeightField({
  value,
  onChange,
}: {
  value: BannerHeight;
  onChange: (value: BannerHeight) => void;
}) {
  const additionalValue = ["thin", "compact", "tall"].includes(value)
    ? value
    : "";
  return (
    <div className="banner-height-settings">
      <div className="block-display-settings banner-height-main-settings">
        <IconChoiceField
          label="ขนาดแบนเนอร์"
          value={value}
          onChange={onChange}
          options={[
            {
              value: "auto",
              label: "ภาพประชาสัมพันธ์ 16:9 — แนะนำ 1920 × 1080 พิกเซล",
              caption: "ภาพ 16:9",
              icon: <span className="banner-height-choice-icon is-auto" />,
            },
            {
              value: "standard",
              label: "แบนเนอร์มาตรฐาน 8:3 — แนะนำ 1920 × 720 พิกเซล",
              caption: "มาตรฐาน 8:3",
              icon: <span className="banner-height-choice-icon is-standard" />,
            },
            {
              value: "slim",
              label: "แบนเนอร์แนวกว้าง 32:7 — แนะนำ 1920 × 420 พิกเซล",
              caption: "กว้าง 32:7",
              icon: <span className="banner-height-choice-icon is-slim" />,
            },
          ]}
        />
      </div>
      <Field label="ขนาดอื่น (กรณีเฉพาะ)">
        <NativeSelect
          value={additionalValue}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value as BannerHeight);
          }}
        >
          <option value="">เลือกขนาดอื่น</option>
          <option value="thin">แถบบาง — สูง 280 พิกเซล</option>
          <option value="compact">กะทัดรัด 16:5 — 1920 × 600 พิกเซล</option>
          <option value="tall">ทรงสูง 32:15 — 1920 × 900 พิกเซล</option>
        </NativeSelect>
      </Field>
      
    </div>
  );
}

function BannerContentPositionField({
  value,
  onChange,
}: {
  value: BannerContentPosition;
  onChange: (value: BannerContentPosition) => void;
}) {
  const options: { value: BannerContentPosition; label: string }[] = [
    { value: "top-left", label: "ซ้ายบน" },
    { value: "top-center", label: "กลางบน" },
    { value: "top-right", label: "ขวาบน" },
    { value: "center-left", label: "ซ้ายกลาง" },
    { value: "center", label: "กึ่งกลาง" },
    { value: "center-right", label: "ขวากลาง" },
    { value: "bottom-left", label: "ซ้ายล่าง" },
    { value: "bottom-center", label: "กลางล่าง" },
    { value: "bottom-right", label: "ขวาล่าง" },
  ];
  return (
    <div className="block-display-settings banner-content-position-settings">
      <IconChoiceField
        label="ตำแหน่งชุดข้อความ"
        value={value}
        onChange={onChange}
        options={options.map((option) => ({
          ...option,
          caption: option.label,
          icon: (
            <span
              className={`banner-content-position-icon is-${option.value}`}
            />
          ),
        }))}
      />
    </div>
  );
}

function SpacingSetting({ side, value, onChange, disabled }: { side: "top" | "bottom"; value: BuilderBlock["spacingTop"]; onChange: (value: BuilderBlock["spacingTop"]) => void; disabled: boolean }) {
  const options = [
    { value: "none", label: "ไม่มี" },
    { value: "small", label: "น้อย" },
    { value: "standard", label: "มาตรฐาน (ค่าเดิม)", caption: "ค่าเดิม" },
    { value: "large", label: "มาก" },
  ] as const;
  return <IconChoiceField label={side === "top" ? "ระยะห่างด้านบน" : "ระยะห่างด้านล่าง"} value={value} onChange={onChange} disabled={disabled} options={options.map((option) => ({ ...option, icon: <span className={`block-spacing-icon ${side} is-${option.value}`}/> }))}/>;
}

function PositionSetting({ width, value, onChange }: { width: BuilderBlock["width"]; value: BuilderBlock["position"]; onChange: (value: BuilderBlock["position"]) => void }) {
  const disabled = width === "full";
  const normalizedValue = normalizeBlockPosition(width, value);
  const available = blockPositionsForWidth(width);
  const options = [
    { value: "left-standard", label: "ชิดซ้ายตามแนวมาตรฐาน", caption: "ซ้าย · ปกติ", icon: <span className="block-position-icon left standard"/> },
    { value: "left-wide", label: "ชิดซ้ายตามแนวกว้าง", caption: "ซ้าย · กว้าง", icon: <span className="block-position-icon left wide"/> },
    { value: "left-full", label: "ชิดซ้ายสุดพื้นที่เนื้อหา", caption: "ซ้าย · เต็ม", icon: <span className="block-position-icon left full"/> },
    { value: "center", label: "กึ่งกลาง", caption: "กลาง", icon: <span className="block-position-icon center"/> },
    { value: "right-standard", label: "ชิดขวาตามแนวมาตรฐาน", caption: "ขวา · ปกติ", icon: <span className="block-position-icon right standard"/> },
    { value: "right-wide", label: "ชิดขวาตามแนวกว้าง", caption: "ขวา · กว้าง", icon: <span className="block-position-icon right wide"/> },
    { value: "right-full", label: "ชิดขวาสุดพื้นที่เนื้อหา", caption: "ขวา · เต็ม", icon: <span className="block-position-icon right full"/> },
  ] satisfies { value: BuilderBlock["position"]; label: string; caption: string; icon: ReactNode }[];
  return <div className="block-position-controls">
    <IconChoiceField label="ตำแหน่งบล็อก" value={normalizedValue} disabled={disabled} onChange={onChange} options={options.filter((option) => available.includes(option.value))}/>
    
  </div>;
}

function WidthSetting({ value, onChange }: { value: BuilderBlock["width"]; onChange: (value: BuilderBlock["width"]) => void }) {
  return (
    <div className="block-width-field">
      <span>ความกว้าง</span>
      <div className="block-width-options" role="group" aria-label="เลือกความกว้าง">
        {widthOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "selected" : ""}
            aria-label={option.label}
            title={option.label}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            <span className={`block-width-icon is-${option.value}`} aria-hidden="true" />
            <span className="block-choice-caption">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function LimitField({
  value,
  onChange,
  control = "number",
  label = "จำนวนรายการ",
  selectOptions = [3, 6, 9, 12],
}: {
  value: number;
  onChange: (value: number) => void;
  control?: "number" | "select";
  label?: string;
  selectOptions?: readonly number[];
}) {
  if (control === "select") {
    const values = selectOptions.includes(value)
      ? selectOptions
      : [...selectOptions, value].sort((left, right) => left - right);
    return (
      <Field label={label}>
        <NativeSelect
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {values.map((option) => (
            <option value={option} key={option}>
              {option} รายการ{selectOptions.includes(option) ? "" : " (ค่าเดิม)"}
            </option>
          ))}
        </NativeSelect>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <input
        type="number"
        min={1}
        max={12}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= 1 && next <= 12) onChange(next);
        }}
      />
    </Field>
  );
}

function InsertBlockModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: BuilderKind) => void;
}) {
  const [search, setSearch] = useState("");
  if (!open) return null;
  const kinds = blockKinds.filter((kind) =>
    labels[kind]
      .toLocaleLowerCase("th")
      .includes(search.toLocaleLowerCase("th")),
  );
  return (
    <div className="builder-modal-layer">
      <button
        className="builder-modal-backdrop"
        onClick={onClose}
        aria-label="ปิด"
      />
      <div className="insert-block-modal" role="dialog" aria-modal="true">
        <header>
          <strong>เพิ่ม Block</strong>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <label>
          <Search size={15} />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหา Block..."
          />
        </label>
        <div className="insert-block-grid">
          {kinds.map((kind) => {
            const Icon = blockIcons[kind];
            return (
              <button
                key={kind}
                onClick={() => {
                  onPick(kind);
                  onClose();
                }}
              >
                <Icon size={21} />
                <span>{labels[kind]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
