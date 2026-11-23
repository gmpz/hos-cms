"use client";

import { createId } from "@/utils/create-id";
import type { JSONContent } from "@tiptap/react";
import { NativeSelect } from "@/components/ui/native-select";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  PenLine,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  UsersRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import { showGlobalToast } from "@/components/ui/global-toast";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { PublishDropdown } from "@/components/admin/publish-dropdown";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MediaPicker } from "@/features/media/components/media-picker";
import { displayMediaFor } from "@/features/media/resolved-media";
import {
  mediaPreviewStyle,
} from "@/features/media/demo/media-registry";
import {
  createUnit,
  unitServiceIconName,
  unitSectionLabels,
  type DemoUnit,
  type UnitServiceGroup,
} from "../demo/model";
import { discardUnitDraft, readUnits, refreshUnits, saveUnit } from "../demo/storage";
import { PersonnelPhotoFocusEditor } from "./personnel-photo-focus-editor";
import { personnelPhotoPositionStyle } from "./personnel-photo-position";
import { UnitCoverFocusEditor } from "./unit-cover-focus-editor";
import type { LinkTarget } from "@/types/content";
import { pagesChangeEvent, readPageSummaries, refreshPageSummaries } from "@/features/pages/demo/page-list-storage";
import type { DemoPageSummary } from "@/features/pages/demo/pages";
import { AccessControlButton, AccessControlDialog } from "@/features/access/components/access-control-dialog";
import type { AccessOptions } from "@/features/access/types";
import { NavigationIcon, navigationIcons } from "@/features/navigation/navigation-icons";
import { navigationIconNames, type NavigationIconName } from "@/features/navigation/icon-names";
import { moduleRouteCatalog, selectableModuleRoutes } from "@/features/navigation/module-routes";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AnchoredSelect } from "@/components/ui/anchored-select";
import { phoneDigits, phoneExtensionMaxLength, phoneMaxLength } from "@/features/users/phone";

const subscribeToHydration = () => () => undefined;
function unitDraftSnapshot(unit: DemoUnit): string {
  const { updatedAt: _updatedAt, coverImageUrl: _coverImageUrl, ...draft } = unit;
  return JSON.stringify(draft);
}
function plainTextFromLegacyContent(content: JSONContent): string {
  if (content.type === "hardBreak") return "\n";
  if (content.text) return content.text;
  const separator = content.type === "doc" || content.type === "listItem" || content.type === "bulletList" || content.type === "orderedList" ? "\n" : "";
  return (content.content ?? []).map(plainTextFromLegacyContent).join(separator);
}
function legacyContentFromPlainText(value: string): JSONContent {
  return { type: "doc", content: value.split("\n").map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })) };
}
type PersonnelProfileOption = { id: string; name: string; position: string; phone: string; phoneExtension: string; email: string; mediaId: string | null; photoFocus: { x: number; y: number }; unitIds: string[]; units: string[] };
type PersonnelProfileOptions = { positions: string[]; levels: string[] };

export function UnitEditor({ unitId }: { unitId: string | null }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const router = useRouter();
  const pathname = usePathname();
  const [unit, setUnit] = useState<DemoUnit>(() =>
    unitId
      ? (readUnits(true).find((item) => item.id === unitId) ??
        createUnit(unitId))
      : createUnit("new-unit"),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => unitDraftSnapshot(unit));
  const [publishedSnapshot, setPublishedSnapshot] = useState<string | null>(null);
  const [unitLoaded, setUnitLoaded] = useState(!unitId);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const [personPickerId, setPersonPickerId] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [generalSection, setGeneralSection] = useState<"details" | "contact">("details");
  const [confirmAction, setConfirmAction] = useState<
    "draft" | "publish" | null
  >(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [unpublishPending, setUnpublishPending] = useState(false);
  const [deleteService, setDeleteService] = useState<
    | { kind: "group"; groupId: string; label: string }
    | { kind: "link"; groupId: string; linkId: string; label: string }
    | null
  >(null);
  const [deleteMissionId, setDeleteMissionId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);
  const [selectedServiceGroupId, setSelectedServiceGroupId] = useState<string | null>(null);
  const [expandedServiceLinkId, setExpandedServiceLinkId] = useState<string | null>(null);
  const setToast = showGlobalToast;
  const [tab, setTab] = useState<
    "general" | "content" | "services" | "personnel" | "layout"
  >("general");
  const [accessOptions, setAccessOptions] = useState<AccessOptions>({ units: [], users: [] });
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const hasUnsavedChanges = unitDraftSnapshot(unit) !== savedSnapshot;
  const savedUnit = JSON.parse(savedSnapshot) as DemoUnit;
  const badgeUnit = JSON.parse(unit.publishedSlug ? publishedSnapshot ?? savedSnapshot : unitDraftSnapshot(createUnit(unit.id))) as DemoUnit;
  const changed = (current: unknown, saved: unknown) => JSON.stringify(current) !== JSON.stringify(saved);
  const accessValues = [unit.accessLevel, unit.accessGrants];
  const accessUnsaved = changed(accessValues, [savedUnit.accessLevel, savedUnit.accessGrants]);
  const accessUnpublished = changed(accessValues, [badgeUnit.accessLevel, badgeUnit.accessGrants]);
  const accessNotice = accessUnsaved ? "unsaved" : accessUnpublished ? "draft" : undefined;
  const tabDirty = {
    general: changed([unit.name, unit.shortName, unit.slug, unit.summary, unit.contact, unit.coverMediaId, unit.coverFocus, unit.about, unit.accessLevel, unit.accessGrants], [badgeUnit.name, badgeUnit.shortName, badgeUnit.slug, badgeUnit.summary, badgeUnit.contact, badgeUnit.coverMediaId, badgeUnit.coverFocus, badgeUnit.about, badgeUnit.accessLevel, badgeUnit.accessGrants]),
    content: changed([unit.vision, unit.visionStatement, unit.mission, unit.missionItems], [badgeUnit.vision, badgeUnit.visionStatement, badgeUnit.mission, badgeUnit.missionItems]),
    services: changed(unit.services, badgeUnit.services),
    personnel: changed(unit.personnel, badgeUnit.personnel),
    layout: changed([unit.sectionOrder, unit.sectionVisibility, unit.sectionBackground], [badgeUnit.sectionOrder, badgeUnit.sectionVisibility, badgeUnit.sectionBackground]),
  };
  const hasSavedDraft = Boolean(unitId) && (unit.status === "draft" || Boolean(unit.hasUnpublishedChanges));
  const shouldWarnOnLeave = hydrated && unitLoaded && (hasUnsavedChanges || !unitId);
  const coverMedia = displayMediaFor(unit, "coverMediaId");
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
      if (destination.protocol !== "http:" && destination.protocol !== "https:" || destination.href === window.location.href) return;
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
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [discardPending, setDiscardPending] = useState(false);
  const [personnelProfiles, setPersonnelProfiles] = useState<PersonnelProfileOption[]>([]);
  const [personnelProfileOptions, setPersonnelProfileOptions] = useState<PersonnelProfileOptions>({ positions: [], levels: [] });
  const [personnelAddOpen, setPersonnelAddOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personnelSearch, setPersonnelSearch] = useState("");
  const tabsRef = useRef<HTMLElement>(null);
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const update = () => setTabOverflow({ left: tabs.scrollLeft > 1, right: tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 1 });
    const onWheel = (event: WheelEvent) => {
      if (tabs.scrollWidth <= tabs.clientWidth) return;
      const amount = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      const canMove = amount < 0 ? tabs.scrollLeft > 0 : tabs.scrollLeft + tabs.clientWidth < tabs.scrollWidth - 1;
      if (canMove) { event.preventDefault(); tabs.scrollLeft += amount; }
    };
    const observer = new ResizeObserver(update);
    observer.observe(tabs);
    window.addEventListener("resize", update);
    tabs.addEventListener("scroll", update);
    tabs.addEventListener("wheel", onWheel, { passive: false });
    update();
    return () => { observer.disconnect(); window.removeEventListener("resize", update); tabs.removeEventListener("scroll", update); tabs.removeEventListener("wheel", onWheel); };
  }, [hydrated]);
  const [pageSummaries, setPageSummaries] = useState<DemoPageSummary[]>(() => readPageSummaries());
  useEffect(() => {
    const syncPages = () => setPageSummaries(readPageSummaries());
    window.addEventListener(pagesChangeEvent, syncPages);
    void refreshPageSummaries().catch(() => undefined);
    return () => window.removeEventListener(pagesChangeEvent, syncPages);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextUnit = unitId
        ? (readUnits(true).find((item) => item.id === unitId) ??
          createUnit(unitId))
        : createUnit("new-unit");
      setUnit(nextUnit);
      setSavedSnapshot(unitDraftSnapshot(nextUnit));
      setPublishedSnapshot(null);
      setUnitLoaded(!unitId);
      setPersonPickerId(null);
      setConfirmAction(null);
      setDiscardConfirmOpen(false);
      setSelectedServiceGroupId(null);
      setExpandedServiceLinkId(null);
      setSelectedPersonId(null);
      setDeletePersonId(null);
      setTab("general");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, unitId]);
  useEffect(() => {
    if (!unitId) return;
    let active = true;
    void refreshUnits(true).then((units) => {
      if (!active) return;
      const saved = units.find((item) => item.id === unitId);
      if (saved) {
        setUnit(saved);
        setSavedSnapshot(unitDraftSnapshot(saved));
        setUnitLoaded(true);
        setSelectedPersonId(null);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [unitId]);
  useEffect(() => {
    if (!unitId) return;
    let active = true;
    void fetch(`/api/units/${unitId}/published`, { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as DemoUnit : null)
      .then((published) => { if (active) setPublishedSnapshot(published ? unitDraftSnapshot(published) : null); })
      .catch(() => { if (active) setPublishedSnapshot(null); });
    return () => { active = false; };
  }, [unitId]);
  useEffect(() => {
    let active = true;
    void fetch("/api/access-options", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const options = await response.json() as AccessOptions;
      if (active) setAccessOptions(options);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void fetch("/api/users/directory", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const profiles = await response.json() as PersonnelProfileOption[];
      if (active) setPersonnelProfiles(profiles);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void fetch("/api/users/profile-options", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const options = await response.json() as PersonnelProfileOptions;
      if (active) setPersonnelProfileOptions(options);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!hydrated) return <AdminContentLoading/>;
  function patch(value: Partial<DemoUnit>) {
    setUnit((current) => ({ ...current, ...value, updatedAt: "เมื่อสักครู่" }));
  }
  function confirmServiceDelete() {
    if (!deleteService) return;
    setUnit((current) => ({
      ...current,
      updatedAt: "เมื่อสักครู่",
      services: deleteService.kind === "group"
        ? current.services.filter((group) => group.id !== deleteService.groupId)
        : current.services.map((group) => group.id === deleteService.groupId
          ? { ...group, items: group.items.filter((item) => item.id !== deleteService.linkId) }
          : group),
    }));
    if (deleteService.kind === "link" && expandedServiceLinkId === deleteService.linkId) setExpandedServiceLinkId(null);
    if (deleteService.kind === "group" && selectedServiceGroupId === deleteService.groupId) setSelectedServiceGroupId(null);
    setDeleteService(null);
  }
  async function persist(publish: boolean) {
    if (unitId && !readUnits(true).some((item) => item.id === unitId)) {
      setToast({ title: "บันทึกไม่สำเร็จ", description: "ไม่พบกลุ่มงานในฐานข้อมูล กรุณาโหลดหน้านี้ใหม่", variant: "error" });
      return;
    }
    const id = unitId ? unit.id : createId();
    const next = {
      ...unit,
      id,
      status: publish ? ("published" as const) : unit.status,
      name: unit.name || "กลุ่มงานใหม่",
      slug: unit.slug || `unit-${id.slice(0, 8)}`,
    };
    setConfirmAction(null);
    try {
      const saved = await saveUnit(next, publish);
      setUnit(saved);
      setSavedSnapshot(unitDraftSnapshot(saved));
      if (publish) setPublishedSnapshot(unitDraftSnapshot(saved));
      if (!unitId) allowLeaveRef.current = true;
      setToast({
        title: publish ? "เผยแพร่กลุ่มงานแล้ว" : "บันทึกร่างแล้ว",
        description: publish
          ? `“${next.name}” แสดงบนเว็บไซต์เรียบร้อยแล้ว`
          : `บันทึก “${next.name}” แล้ว การเปลี่ยนแปลงยังไม่เผยแพร่`,
        variant: "success",
      });
      if (!unitId) router.replace(`/admin/units/${id}/edit`);
    } catch (error) {
      setToast({
        title: "บันทึกไม่สำเร็จ",
        description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อฐานข้อมูล",
        variant: "error",
      });
    }
  }
  async function discardSavedDraft() {
    if (!unitId || discardPending) return;
    setDiscardPending(true);
    try {
      const restored = await discardUnitDraft(unitId);
      setUnit(restored);
      setSavedSnapshot(unitDraftSnapshot(restored));
      setDiscardConfirmOpen(false);
      setToast({ title: "ยกเลิกฉบับร่างแล้ว", description: "ข้อมูลในฟอร์มกลับเป็นฉบับเผยแพร่ล่าสุด หน้าเว็บไซต์ไม่เปลี่ยนแปลง", variant: "success" });
    } catch (error) {
      setToast({ title: "ยกเลิกฉบับร่างไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง", variant: "error" });
    } finally {
      setDiscardPending(false);
    }
  }
  async function unpublish() {
    if (!unitId || unpublishPending || unit.status !== "published") return;
    setUnpublishPending(true);
    try {
      const response = await fetch(`/api/units/${unitId}/unpublish`, { method: "POST" });
      const result = await response.json() as DemoUnit | { error: string };
      if (!response.ok || !("id" in result)) throw new Error("error" in result ? result.error : "ยกเลิกเผยแพร่ไม่สำเร็จ");
      setUnit(result);
      setSavedSnapshot(unitDraftSnapshot(result));
      setPublishedSnapshot(null);
      setConfirmUnpublish(false);
      void refreshUnits(true).catch(() => undefined);
      setToast({ title: "ยกเลิกเผยแพร่แล้ว", description: `“${result.name}” ไม่แสดงบนเว็บไซต์แล้ว`, variant: "success" });
    } catch (error) {
      setToast({ title: "ยกเลิกเผยแพร่ไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    } finally { setUnpublishPending(false); }
  }
  function reorderSections(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index)
      return;
    const sectionOrder = [...unit.sectionOrder];
    const [moved] = sectionOrder.splice(result.source.index, 1);
    sectionOrder.splice(result.destination.index, 0, moved);
    patch({ sectionOrder });
  }
  function reorderPersonnel(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index)
      return;
    const personnel = [...unit.personnel];
    const [moved] = personnel.splice(result.source.index, 1);
    personnel.splice(result.destination.index, 0, moved);
    patch({ personnel });
  }
  function reorderMission(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const missionItems = [...(unit.missionItems ?? [])];
    const [moved] = missionItems.splice(result.source.index, 1);
    missionItems.splice(result.destination.index, 0, moved);
    patch({ missionItems });
  }
  function reorderServiceLink(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index)
      return;
    if (result.source.droppableId === "unit-service-groups") {
      const services = [...unit.services];
      const [moved] = services.splice(result.source.index, 1);
      services.splice(result.destination.index, 0, moved);
      patch({ services });
      return;
    }
    const groupId = result.source.droppableId.replace("unit-service-links:", "");
    if (result.destination.droppableId !== result.source.droppableId) return;
    patch({
      services: unit.services.map((group) => {
        if (group.id !== groupId) return group;
        const items = [...group.items];
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination!.index, 0, moved);
        return { ...group, items };
      }),
    });
  }
  const hoursMatch = unit.contact.hours.match(/^(\d{2}:\d{2})?\s*[-–]\s*(\d{2}:\d{2})?$/);
  const openingTime = hoursMatch?.[1] ?? "";
  const closingTime = hoursMatch?.[2] ?? "";
  const setHours = (start: string, end: string) =>
    patch({ contact: { ...unit.contact, hours: start || end ? `${start} - ${end}` : "" } });
  return (
    <>
      <div className="unit-editor">
      <header className="unit-editor-heading">
        <div>
          <Link href="/admin/units">
            <ArrowLeft size={16} />
            ย้อนกลับ
          </Link>
          <h1>{unitId ? "แก้ไขกลุ่มงาน" : "สร้างกลุ่มงาน"}</h1>
          <p>{unit.name || "กำหนดข้อมูลและหน้าเว็บไซต์ของกลุ่มงาน"}</p>
        </div>
        <div>
          <button disabled={!hasUnsavedChanges && Boolean(unitId)} onClick={() => setConfirmAction("draft")}>
            <Save size={15} />
            บันทึกร่าง
          </button>
          <AccessControlButton level={unit.accessLevel} notice={accessNotice} onClick={() => setAccessDialogOpen(true)}/>
          <div className="admin-publish-split">
            <button className="primary-button" disabled={unpublishPending || (unit.status === "published" && !hasUnsavedChanges && !unit.hasUnpublishedChanges)} onClick={() => setConfirmAction("publish")}><Send size={15} />เผยแพร่</button>
            {unitId && unit.status === "published" ? <PublishDropdown disabled={unpublishPending} onUnpublish={() => setConfirmUnpublish(true)}/> : null}
          </div>
        </div>
      </header>
      {unitLoaded && (hasUnsavedChanges || !unitId || hasSavedDraft) ? <section className="splash-draft-notice" aria-live="polite">
        <div>
          <strong>{hasUnsavedChanges ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : !unitId ? "กลุ่มงานนี้ยังไม่ได้บันทึก" : unit.hasUnpublishedChanges ? "มีร่างที่บันทึกแล้ว ยังไม่ได้เผยแพร่" : "บันทึกร่างแล้ว ยังไม่ได้เผยแพร่"}</strong>
          {hasSavedDraft ? <p>บันทึกล่าสุด {unit.updatedAt} · {unit.status === "published" ? "หน้าเว็บไซต์ยังแสดงฉบับเดิม" : "กลุ่มงานนี้ยังไม่แสดงบนเว็บไซต์"}</p> : null}
        </div>
        {unit.status === "published" && unit.hasUnpublishedChanges ? <button type="button" disabled={discardPending} onClick={() => setDiscardConfirmOpen(true)}><RotateCcw size={16}/>ยกเลิกร่างที่บันทึก</button> : null}
      </section> : null}
      <div className="unit-tabs-shell" data-overflow={tabOverflow.left || tabOverflow.right}>
      <button type="button" className="unit-tabs-arrow" aria-label="เลื่อนแท็บไปทางซ้าย" disabled={!tabOverflow.left} onClick={() => tabsRef.current?.scrollBy({ left: -240, behavior: "smooth" })}><ChevronLeft size={18}/></button>
      <nav ref={tabsRef} className="unit-tabs" aria-label="ส่วนข้อมูลกลุ่มงาน">
        {(
          [
            ["general", "ข้อมูลทั่วไป"],
            ["content", "เนื้อหาหน่วยงาน"],
            ["services", "เมนูบริการแบบกลุ่ม"],
            ["personnel", "บุคลากร"],
            ["layout", "การจัดหน้า"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            aria-label={tabDirty[value] ? `${label} มีการเปลี่ยนแปลงที่ยังไม่เผยแพร่` : label}
            onClick={(event) => { setTab(value); event.currentTarget.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }}
          >
            {label}{tabDirty[value] ? <span className="unit-tab-dirty-badge" aria-hidden="true">!</span> : null}
          </button>
        ))}
      </nav>
      <button type="button" className="unit-tabs-arrow" aria-label="เลื่อนแท็บไปทางขวา" disabled={!tabOverflow.right} onClick={() => tabsRef.current?.scrollBy({ left: 240, behavior: "smooth" })}><ChevronRight size={18}/></button>
      </div>
      <div className="unit-editor-card">
        {tab === "general" ? (
          <div className="unit-general-layout">
            <div className="unit-general-info-card">
            <nav className="unit-general-subtabs" aria-label="ข้อมูลทั่วไปของหน่วยงาน">
              <button type="button" className={generalSection === "details" ? "active" : ""} onClick={() => setGeneralSection("details")}>ข้อมูลกลุ่มงาน</button>
              <button type="button" className={generalSection === "contact" ? "active" : ""} onClick={() => setGeneralSection("contact")}>ช่องทางติดต่อ</button>
            </nav>
            {generalSection === "details" ? <section className="unit-general-panel unit-general-details" aria-labelledby="unit-general-details-title">
              <div className="unit-general-panel-heading"><h2 id="unit-general-details-title">ข้อมูลกลุ่มงาน</h2><p>ชื่อและคำอธิบายที่แสดงบนหน้าเว็บไซต์</p></div>
              <div className="unit-general-fields">
                <EditorField label="ชื่อกลุ่มงาน" dirty={changed(unit.name, badgeUnit.name)}><input value={unit.name} onChange={(event) => patch({ name: event.target.value })}/></EditorField>
                <EditorField label="ชื่อย่อ" dirty={changed(unit.shortName, badgeUnit.shortName)}><input value={unit.shortName} onChange={(event) => patch({ shortName: event.target.value })}/></EditorField>
                <EditorField label="Slug" dirty={changed(unit.slug, badgeUnit.slug)}><input value={unit.slug} onChange={(event) => patch({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}/></EditorField>
                <p className="unit-general-path">ที่อยู่หน้าเว็บไซต์: <span>/units/{unit.slug || "ชื่อกลุ่มงาน"}</span></p>
                <EditorField label="คำอธิบายสั้น" dirty={changed(unit.summary, badgeUnit.summary)}><textarea rows={4} value={unit.summary} onChange={(event) => patch({ summary: event.target.value })}/></EditorField>
              </div>
            </section> : <section className="unit-general-panel unit-general-contact-panel" aria-labelledby="unit-general-contact-title">
              <div className="unit-general-panel-heading"><h2 id="unit-general-contact-title">ช่องทางติดต่อ</h2><p>ข้อมูลสำหรับแสดงในส่วนติดต่อของหน้ากลุ่มงาน</p></div>
              <div className="unit-general-contact-fields">
                <EditorField label="โทรศัพท์" dirty={changed(unit.contact.phone, badgeUnit.contact.phone)}><input type="tel" inputMode="numeric" autoComplete="tel" maxLength={phoneMaxLength} placeholder="เช่น 0812345678" value={unit.contact.phone} onChange={(event) => patch({ contact: { ...unit.contact, phone: phoneDigits(event.target.value) } })}/></EditorField>
                <EditorField label="เบอร์ภายใน" dirty={changed(unit.contact.internalPhone, badgeUnit.contact.internalPhone)}><input type="tel" inputMode="numeric" maxLength={phoneExtensionMaxLength} placeholder="เช่น 1234" value={unit.contact.internalPhone} onChange={(event) => patch({ contact: { ...unit.contact, internalPhone: phoneDigits(event.target.value, phoneExtensionMaxLength) } })}/></EditorField>
                <EditorField label="อีเมล" dirty={changed(unit.contact.email, badgeUnit.contact.email)}><input type="email" value={unit.contact.email} onChange={(event) => patch({ contact: { ...unit.contact, email: event.target.value } })}/></EditorField>
                <EditorField label="สถานที่" dirty={changed(unit.contact.location, badgeUnit.contact.location)}><input value={unit.contact.location} onChange={(event) => patch({ contact: { ...unit.contact, location: event.target.value } })}/></EditorField>
                <div className="unit-contact-hours">
                  <span>เวลาทำการ</span>
                  <div className="unit-contact-time-range">
                    <EditorField label="เริ่ม" dirty={changed(unit.contact.hours, badgeUnit.contact.hours)}><input type="time" value={openingTime} onChange={(event) => setHours(event.target.value, closingTime)}/></EditorField>
                    <span aria-hidden="true">–</span>
                    <EditorField label="สิ้นสุด" dirty={changed(unit.contact.hours, badgeUnit.contact.hours)}><input type="time" value={closingTime} onChange={(event) => setHours(openingTime, event.target.value)}/></EditorField>
                  </div>
                  {unit.contact.hours && !hoursMatch ? <small>ข้อมูลเดิม: {unit.contact.hours} — เลือกเวลาใหม่เพื่อเปลี่ยน</small> : null}
                </div>
              </div>
            </section>}
            </div>
            <section className="unit-general-panel unit-general-cover-panel" aria-labelledby="unit-general-cover-title">
              <div className="unit-general-panel-heading">
                <h2 id="unit-general-cover-title">รูปการ์ดหน่วยงาน <UnsavedBadge show={changed([unit.coverMediaId, unit.coverFocus], [badgeUnit.coverMediaId, badgeUnit.coverFocus])}/></h2>
                <p>ตัวอย่างนี้แสดงสัดส่วนเดียวกับการ์ดในหน้ารวมหน่วยงาน</p>
              </div>
              {coverMedia ? <>
                <div className="unit-cover-card-preview public-unit-card" aria-label="ตัวอย่างการ์ดหน่วยงาน">
                  <span className="public-unit-card-cover has-cover">
                    <UnitCoverFocusEditor
                      imageStyle={mediaPreviewStyle(coverMedia)}
                      imageUrl={coverMedia.previewUrl}
                      dimensions={coverMedia.dimensions}
                      value={unit.coverFocus}
                      onChange={(coverFocus) => patch({ coverFocus })}
                      variant="card"
                    />
                  </span>
                  <span className="public-unit-card-body">
                    <h2>{unit.name || "ชื่อหน่วยงาน"}</h2>
                    <span className="public-unit-card-meta"><span><UsersRound size={14}/>{unit.personnel.length} บุคลากร</span><b>ดูรายละเอียด <ArrowRight size={14}/></b></span>
                  </span>
                </div>
                <label className="unit-general-cover-zoom">
                  <span>ซูมภาพ</span>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.05"
                    value={unit.coverFocus.zoom ?? 1}
                    onChange={(event) => patch({ coverFocus: { ...unit.coverFocus, zoom: Number(event.target.value) } })}
                  />
                  <output>{Math.round((unit.coverFocus.zoom ?? 1) * 100)}%</output>
                </label>
                <div className="unit-general-cover-toolbar">
                  <span>{coverMedia.name} · {coverMedia.dimensions}</span>
                  <div className="unit-general-cover-actions">
                    <button type="button" onClick={() => setCoverPickerOpen(true)}><ImageIcon size={15}/>เปลี่ยนรูป</button>
                    <button type="button" onClick={() => patch({ coverFocus: { x: 50, y: 50, zoom: 1 } })}>รีเซ็ตตำแหน่ง</button>
                    <button type="button" className="unit-cover-remove" onClick={() => patch({ coverMediaId: null, coverImageUrl: null, coverFocus: { x: 50, y: 50, zoom: 1 } })}><Trash2 size={15}/>ลบรูป</button>
                  </div>
                </div>
              </> : <div className="unit-cover-card-preview public-unit-card" aria-label="ตัวอย่างการ์ดหน่วยงาน">
                <span className="public-unit-card-cover fallback"><Building2 size={38}/></span>
                <span className="public-unit-card-body">
                  <h2>{unit.name || "ชื่อหน่วยงาน"}</h2>
                  <span className="public-unit-card-meta"><span><UsersRound size={14}/>{unit.personnel.length} บุคลากร</span><b>ดูรายละเอียด <ArrowRight size={14}/></b></span>
                </span>
                <button type="button" className="unit-cover-card-pick" onClick={() => setCoverPickerOpen(true)}><ImageIcon size={15}/>เลือกรูปจากคลังสื่อ</button>
              </div>}
            </section>
          </div>
        ) : tab === "content" ? (
          <div className="unit-content-form">
            <header className="unit-content-form-intro"><h2>เนื้อหากลุ่มงาน</h2><p>กรอกวิสัยทัศน์และพันธกิจที่จะแสดงบนหน้ากลุ่มงาน</p></header>
            <div className="unit-content-form-panels">
            <section className="unit-content-form-section unit-content-vision-section">
              <div className="unit-content-form-heading"><div><h2>วิสัยทัศน์ <UnsavedBadge show={unit.visionStatement === undefined ? changed(unit.vision, badgeUnit.vision) : changed(unit.visionStatement, badgeUnit.visionStatement)}/></h2></div></div>
              <div className="unit-content-vision-fields">
              {unit.visionStatement === undefined ? <>
                <p className="unit-content-legacy-note">ข้อมูลเดิมยังแสดงบนเว็บไซต์ตามเดิม แก้ไขเป็นข้อความธรรมดาได้ หรือย้ายเข้าช่องวิสัยทัศน์ใหม่เมื่อข้อความไม่เกิน 220 ตัวอักษร</p>
                <textarea id="unit-vision-legacy" aria-label="วิสัยทัศน์เดิม" className="unit-content-vision-input" value={plainTextFromLegacyContent(unit.vision)} rows={5} onChange={(event) => patch({ vision: legacyContentFromPlainText(event.target.value) })} />
                <button type="button" className="unit-content-convert" disabled={plainTextFromLegacyContent(unit.vision).trim().length > 220} onClick={() => patch({ visionStatement: plainTextFromLegacyContent(unit.vision).trim() })}>ใช้ข้อความนี้ในรูปแบบใหม่</button>
              </> : <>
                <textarea id="unit-vision-statement" aria-label="วิสัยทัศน์" className="unit-content-vision-input" value={unit.visionStatement} maxLength={220} rows={3} placeholder="เช่น มุ่งพัฒนาระบบสุขภาพดิจิทัล เพื่อบริการประชาชนอย่างทั่วถึงและมีคุณภาพ" onChange={(event) => patch({ visionStatement: event.target.value })} />
                <div className="unit-content-field-footer"><span>{unit.visionStatement.length}/220</span></div>
              </>}
              </div>
            </section>
            <section className="unit-content-form-section unit-content-mission-section">
              <div className="unit-content-form-heading"><div><h2>พันธกิจ</h2></div>
                {unit.missionItems !== undefined ? <span className="unit-mission-count">{unit.missionItems.length}/6 ข้อ</span> : null}
              </div>
              {unit.missionItems === undefined ? <>
                <p className="unit-content-legacy-note">ข้อมูลเดิมยังแสดงตามเดิมและแก้ไขเป็นข้อความธรรมดาได้ หากต้องการกรอกแยกเป็นข้อ ให้เริ่มรายการใหม่; ข้อมูลเดิมจะยังเก็บไว้แต่ไม่แสดงบนเว็บไซต์</p>
                <label className="unit-content-plain-label" htmlFor="unit-mission-legacy">ข้อความพันธกิจเดิม<UnsavedBadge show={changed(unit.mission, badgeUnit.mission)}/></label>
                <textarea id="unit-mission-legacy" className="unit-content-vision-input" value={plainTextFromLegacyContent(unit.mission)} rows={7} onChange={(event) => patch({ mission: legacyContentFromPlainText(event.target.value) })} />
                <button type="button" className="unit-content-convert" onClick={() => patch({ missionItems: [] })}>เริ่มกรอกพันธกิจแบบรายการ</button>
              </> : <>
                {unit.missionItems.length === 0 ? <p className="unit-mission-editor-empty">ยังไม่มีพันธกิจ กด “เพิ่มข้อ” เพื่อเริ่มกรอก</p> : null}
                <DragDropContext onDragEnd={reorderMission}><Droppable droppableId="unit-mission-items" direction="vertical">
                  {(drop) => <div className="unit-mission-editor-list" ref={drop.innerRef} {...drop.droppableProps}>{unit.missionItems!.map((item, index) => <Draggable key={item.id} draggableId={`unit-mission:${item.id}`} index={index}>
                    {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`unit-mission-editor-item${snapshot.isDragging ? " dragging" : ""}`}>
                  <div className="unit-mission-editor-order"><button type="button" className="unit-mission-drag-handle" {...drag.dragHandleProps} aria-label={`ลากเพื่อจัดลำดับพันธกิจข้อ ${index + 1}`} title="ลากเพื่อจัดลำดับ"><GripVertical size={17}/></button><span className="unit-mission-editor-number">{String(index + 1).padStart(2, "0")}</span></div>
                  <div className="unit-mission-editor-fields">
                    <label className="unit-mission-editor-title"><span className="unit-mission-field-label"><span className="unit-mission-field-name">หัวข้อ <UnsavedBadge show={changed(item.title, badgeUnit.missionItems?.find((saved) => saved.id === item.id)?.title)}/></span><small className="unit-mission-character-count">{item.title.length}/40</small></span><input value={item.title} maxLength={40} placeholder="เช่น พัฒนาระบบบริการ" onChange={(event) => patch({ missionItems: unit.missionItems?.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry) ?? [] })} /></label>
                    <label className="unit-mission-editor-description"><span className="unit-mission-field-label"><span className="unit-mission-field-name">คำอธิบาย <UnsavedBadge show={changed(item.description, badgeUnit.missionItems?.find((saved) => saved.id === item.id)?.description)}/></span><small className="unit-mission-character-count">{item.description.length}/120</small></span><textarea value={item.description} maxLength={120} rows={2} placeholder="อธิบายเป้าหมายของข้อนี้แบบกระชับ" onChange={(event) => patch({ missionItems: unit.missionItems?.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry) ?? [] })} /></label>
                  </div>
                  <div className="unit-mission-editor-actions"><button type="button" onClick={() => setDeleteMissionId(item.id)} aria-label={`ลบพันธกิจข้อ ${index + 1}`} title="ลบข้อ"><Trash2 size={16} /></button></div>
                </div>}
                  </Draggable>)}{drop.placeholder}</div>}
                </Droppable></DragDropContext>
                <button type="button" className="unit-content-add-mission" disabled={unit.missionItems.length >= 6} onClick={() => patch({ missionItems: [...(unit.missionItems ?? []), { id: createId(), title: "", description: "" }] })}><Plus size={17} /> เพิ่มพันธกิจอีกข้อ</button>
              </>}
            </section>
            </div>
          </div>
        ) : tab === "services" ? (
          <DragDropContext onDragEnd={reorderServiceLink}>
            <div className="unit-service-workspace">
              <aside className="unit-service-categories" aria-label="หมวดบริการ">
                <div className="unit-service-panel-heading"><strong>หมวดบริการ ({unit.services.length}/6)</strong><button type="button" disabled={unit.services.length >= 6} onClick={() => { const group = { id: createId(), title: "หมวดบริการใหม่", icon: "heart-pulse" as const, accent: "primary" as const, items: [] }; patch({ services: [...unit.services, group] }); setSelectedServiceGroupId(group.id); setExpandedServiceLinkId(null); }}><Plus size={15}/>เพิ่มหมวด</button></div>
                <Droppable droppableId="unit-service-groups" type="unit-service-group">
                  {(drop) => <div className="unit-service-category-list" ref={drop.innerRef} {...drop.droppableProps}>
                    {unit.services.map((group, index) => <Draggable key={group.id} draggableId={`unit-service-group:${group.id}`} index={index}>
                      {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`unit-service-category${(selectedServiceGroupId ?? unit.services[0]?.id) === group.id ? " selected" : ""}${snapshot.isDragging ? " dragging" : ""}`}>
                        <span className="unit-service-category-handle" {...drag.dragHandleProps} aria-label={`ย้ายหมวด ${group.title}`}><GripVertical size={17}/></span>
                        <span className="unit-service-category-number">{index + 1}</span>
                        <button type="button" className="unit-service-category-select" aria-pressed={(selectedServiceGroupId ?? unit.services[0]?.id) === group.id} onClick={() => { setSelectedServiceGroupId(group.id); setExpandedServiceLinkId(null); }}>
                          <span className="unit-service-category-icon"><NavigationIcon name={unitServiceIconName(group.icon)} size={19}/></span>
                          <span><strong>{group.title || `หมวด ${index + 1}`} <UnsavedBadge show={changed(group, badgeUnit.services.find((saved) => saved.id === group.id))}/></strong><small>{group.items.length} ลิงก์</small></span>
                        </button>
                      </div>}
                    </Draggable>)}
                    {drop.placeholder}
                  </div>}
                </Droppable>
              </aside>
              {(() => {
                const group = unit.services.find((entry) => entry.id === selectedServiceGroupId) ?? unit.services[0];
                if (!group) return <div className="unit-service-detail unit-service-empty">ยังไม่มีหมวดบริการ กด “เพิ่มหมวด” เพื่อเริ่มต้น</div>;
                const updateGroup = (change: Partial<UnitServiceGroup>) => patch({ services: unit.services.map((entry) => entry.id === group.id ? { ...entry, ...change } : entry) });
                return <section className="unit-service-detail" aria-label={`แก้ไขหมวด ${group.title}`}>
                  <div className="unit-service-detail-heading"><div><h2>{group.title || "หมวดบริการใหม่"}</h2><p>ตั้งค่าหมวดบริการและจัดการรายการลิงก์ในหมวดนี้</p></div><button type="button" className="unit-service-delete" onClick={() => setDeleteService({ kind: "group", groupId: group.id, label: group.title })}><Trash2 size={15}/>ลบหมวด</button></div>
                  <div className="unit-service-category-fields">
                    <EditorField label="ชื่อหมวด" dirty={changed(group.title, badgeUnit.services.find((saved) => saved.id === group.id)?.title)}><input value={group.title} onChange={(event) => updateGroup({ title: event.target.value })}/></EditorField>
                    <UnitServiceIconPicker value={group.icon} dirty={changed(group.icon, badgeUnit.services.find((saved) => saved.id === group.id)?.icon)} onChange={(icon) => updateGroup({ icon })}/>
                    <EditorField label="สีขอบและไอคอน" dirty={changed(group.accent, badgeUnit.services.find((saved) => saved.id === group.id)?.accent)}><span className="unit-service-accent-select" data-accent={group.accent}><span className="unit-service-accent-swatch" aria-hidden="true"/><NativeSelect value={group.accent} onChange={(event) => updateGroup({ accent: event.target.value as UnitServiceGroup["accent"] })}><option value="primary">สีหลัก</option><option value="secondary">สีรอง</option><option value="accent">สีเน้น</option></NativeSelect></span></EditorField>
                  </div>
                  <div className="unit-service-links-heading"><strong>รายการลิงก์ ({group.items.length}/8)</strong><button type="button" disabled={group.items.length >= 8} onClick={() => { const id = createId(); updateGroup({ items: [...group.items, { id, label: "ลิงก์ใหม่", target: { kind: "module", module: "home" }, openInNewTab: false }] }); setExpandedServiceLinkId(id); }}><Plus size={15}/>เพิ่มลิงก์</button></div>
                  <Droppable droppableId={`unit-service-links:${group.id}`} type="unit-service-link">
                    {(drop) => <div className="unit-service-link-list" ref={drop.innerRef} {...drop.droppableProps}>
                      {group.items.map((item, index) => <Draggable key={item.id} draggableId={`unit-service-link:${item.id}`} index={index}>
                        {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`unit-service-link${expandedServiceLinkId === item.id ? " expanded" : ""}${snapshot.isDragging ? " dragging" : ""}`}>
                          <div className="unit-service-link-summary">
                            <span className="unit-service-link-handle" {...drag.dragHandleProps} aria-label={`ย้ายลิงก์ ${item.label}`}><GripVertical size={16}/></span>
                            <span className="unit-service-link-number">{index + 1}</span>
                            <button type="button" className="unit-service-link-title" aria-expanded={expandedServiceLinkId === item.id} onClick={() => setExpandedServiceLinkId(expandedServiceLinkId === item.id ? null : item.id)}><strong>{item.label || "ลิงก์ใหม่"} <UnsavedBadge show={changed(item, badgeUnit.services.find((saved) => saved.id === group.id)?.items.find((saved) => saved.id === item.id))}/></strong></button>
                            <button type="button" className="unit-service-link-expand" aria-label={expandedServiceLinkId === item.id ? "ย่อลิงก์" : "ขยายลิงก์"} onClick={() => setExpandedServiceLinkId(expandedServiceLinkId === item.id ? null : item.id)}><ChevronDown size={17}/></button>
                          </div>
                          {expandedServiceLinkId === item.id ? <div className="unit-service-link-fields">
                            <EditorField label="ชื่อลิงก์" dirty={changed(item.label, badgeUnit.services.find((saved) => saved.id === group.id)?.items.find((saved) => saved.id === item.id)?.label)}><input value={item.label} onChange={(event) => updateGroup({ items: group.items.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry) })}/></EditorField>
                            <UnitServiceTargetFields target={item.target} dirty={changed(item.target, badgeUnit.services.find((saved) => saved.id === group.id)?.items.find((saved) => saved.id === item.id)?.target)} pages={pageSummaries} openInNewTab={item.openInNewTab} onChange={(target, openInNewTab) => updateGroup({ items: group.items.map((entry) => entry.id === item.id ? { ...entry, target, openInNewTab } : entry) })}/>
                            <label className="unit-service-link-newtab"><span>เปิดในแท็บใหม่ </span><input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateGroup({ items: group.items.map((entry) => entry.id === item.id ? { ...entry, openInNewTab: event.target.checked } : entry) })}/><UnsavedBadge show={changed(item.openInNewTab, badgeUnit.services.find((saved) => saved.id === group.id)?.items.find((saved) => saved.id === item.id)?.openInNewTab)}/></label>
                            <button type="button" className="unit-service-delete unit-service-link-delete" onClick={() => setDeleteService({ kind: "link", groupId: group.id, linkId: item.id, label: item.label })}><Trash2 size={15}/>ลบลิงก์</button>
                          </div> : null}
                        </div>}
                      </Draggable>)}
                      {drop.placeholder}
                      {group.items.length === 0 ? <p className="unit-service-links-empty">ยังไม่มีลิงก์ในหมวดนี้</p> : null}
                    </div>}
                  </Droppable>
                </section>;
              })()}
            </div>
          </DragDropContext>
        ) : tab === "personnel" ? (
          <div className="unit-personnel-layout">
            <aside className="unit-personnel-sidebar">
              <div className="unit-personnel-sidebar-heading"><div><h2>บุคลากรในกลุ่มงาน</h2><p>{unit.personnel.length} คน · ลากเพื่อจัดลำดับ</p></div><button type="button" onClick={() => setPersonnelAddOpen(true)}><Plus size={16}/> เพิ่มบุคลากร</button></div>
              <label className="unit-personnel-search"><Search size={17}/><input value={personnelSearch} onChange={(event) => setPersonnelSearch(event.target.value)} placeholder="ค้นหาบุคลากร..."/></label>
              <DragDropContext onDragEnd={reorderPersonnel}>
                <Droppable droppableId="unit-personnel" direction="vertical">
                  {(drop) => <div className="unit-personnel-list" ref={drop.innerRef} {...drop.droppableProps}>
                    {unit.personnel.map((person, index) => {
                      const photo = displayMediaFor(person);
                      return <Draggable key={person.id} draggableId={person.id} index={index}>
                        {(drag, snapshot) => <div ref={drag.innerRef} {...drag.draggableProps} className={`unit-personnel-list-item${(unit.personnel.some((item) => item.id === selectedPersonId) ? selectedPersonId : unit.personnel[0]?.id) === person.id ? " selected" : ""}${snapshot.isDragging ? " dragging" : ""}${personnelSearch && !`${person.name} ${person.position}`.toLowerCase().includes(personnelSearch.toLowerCase()) ? " search-hidden" : ""}`}>
                          <span className="unit-person-drag" {...drag.dragHandleProps} aria-label={`ลากเพื่อจัดลำดับ ${person.name || `บุคลากร ${index + 1}`}`}><GripVertical size={17}/></span>
                          <button type="button" className="unit-personnel-select" onClick={() => setSelectedPersonId(person.id)}>
                            <span className="unit-person-photo" style={{...mediaPreviewStyle(photo), ...personnelPhotoPositionStyle(person.photoFocus)}}>{photo ? null : <ImageIcon size={21}/>}</span>
                            <span><strong>{person.name || `บุคลากร ${index + 1}`} <UnsavedBadge show={changed(person, badgeUnit.personnel.find((saved) => saved.id === person.id))}/></strong><small>{person.position || "ยังไม่ระบุตำแหน่ง"}</small><em>{person.userId ? "เชื่อมโปรไฟล์" : "กรอกเอง"}</em></span>
                          </button>
                        </div>}
                      </Draggable>;
                    })}
                    {drop.placeholder}
                  </div>}
                </Droppable>
              </DragDropContext>
            </aside>
            <div className="unit-personnel-editor">
              {unit.personnel.map((person, index) => {
                    const photo = displayMediaFor(person);
                    const savedPerson = badgeUnit.personnel.find((saved) => saved.id === person.id);
                    return (
                          <article
                            key={person.id}
                            className={(unit.personnel.some((item) => item.id === selectedPersonId) ? selectedPersonId : unit.personnel[0]?.id) === person.id ? "selected" : ""}
                          >
                            <header>
                              <div>
                                <button
                                  className="unit-person-photo"
                                  type="button"
                                  disabled={person.userId !== null}
                                  style={{
                                    ...mediaPreviewStyle(photo),
                                    ...personnelPhotoPositionStyle(
                                      person.photoFocus,
                                    ),
                                  }}
                                  onClick={() => setPersonPickerId(person.id)}
                                >
                                  {photo ? null : <ImageIcon size={22} />}
                                </button>
                                <div className="unit-person-heading-copy">
                                  <strong>{person.name || `บุคลากร ${index + 1}`}</strong>
                                  <small>{person.userId ? "เชื่อมกับโปรไฟล์ผู้ใช้" : "ข้อมูลแบบกรอกเอง"}</small>
                                  {!person.userId && !photo ? <button className="unit-person-photo-action" type="button" onClick={() => setPersonPickerId(person.id)}><ImageIcon size={15} strokeWidth={1.8}/>เพิ่มรูปบุคลากร</button> : null}
                                </div>
                              </div>
                              <div>
                                <button
                                  className="unit-personnel-delete"
                                  type="button"
                                  aria-label={`นำ ${person.name || `บุคลากร ${index + 1}`} ออกจากกลุ่มงาน`}
                                  onClick={() => setDeletePersonId(person.id)}
                                >
                                  <Trash2 size={15} />นำออก
                                </button>
                              </div>
                            </header>
                            {(
                              <>
                                {person.userId ? <div className="unit-linked-profile"><span>โปรไฟล์บุคลากรจากระบบ</span><strong>{person.name}</strong><small>{person.position || "ไม่ระบุตำแหน่ง"}</small><p>ชื่อ ตำแหน่ง รูป และข้อมูลติดต่อจะอัปเดตจากโปรไฟล์ผู้ใช้อัตโนมัติ</p></div> : null}
                                {!person.userId && photo ? (
                                  <PersonnelPhotoFocusEditor
                                    imageStyle={mediaPreviewStyle(photo)}
                                    value={person.photoFocus}
                                    zoom={person.photoFocus.zoom ?? 100}
                                    onChange={(photoFocus) =>
                                      patch({
                                        personnel: unit.personnel.map((item) =>
                                          item.id === person.id
                                            ? { ...item, photoFocus: { ...photoFocus, zoom: photoFocus.zoom ?? item.photoFocus.zoom ?? 100 } }
                                            : item,
                                        ),
                                      })
                                    }
                                    onZoomChange={(zoom) => setUnit((current) => ({
                                      ...current,
                                      updatedAt: "เมื่อสักครู่",
                                      personnel: current.personnel.map((item) => item.id === person.id ? { ...item, photoFocus: { ...item.photoFocus, zoom } } : item),
                                    }))}
                                    controlActions={<>
                                      <button type="button" onClick={() => setPersonPickerId(person.id)}><ImageIcon size={15}/>เปลี่ยนรูป</button>
                                      <button type="button" onClick={() => patch({ personnel: unit.personnel.map((item) => item.id === person.id ? { ...item, photoFocus: { x: 50, y: 25, zoom: 100 } } : item) })}>รีเซ็ตตำแหน่ง</button>
                                      <button type="button" className="unit-cover-remove" onClick={() => patch({ personnel: unit.personnel.map((item) => item.id === person.id ? { ...item, mediaId: null, photoFocus: { x: 50, y: 25 } } : item) })}><Trash2 size={15}/>ลบรูป</button>
                                    </>}
                                  />
                                ) : null}
                                {!person.userId ? <><div className="unit-form-grid unit-manual-person-grid">
                                  <EditorField label="ชื่อ–นามสกุล" dirty={changed(person.name, savedPerson?.name)}>
                                    <input
                                      value={person.name}
                                      onChange={(event) =>
                                        patch({
                                          personnel: unit.personnel.map(
                                            (item) =>
                                              item.id === person.id
                                                ? {
                                                    ...item,
                                                    name: event.target.value,
                                                  }
                                                : item,
                                          ),
                                        })
                                      }
                                    />
                                  </EditorField>
                                  <EditorField label="ตำแหน่ง" dirty={changed(person.position, savedPerson?.position)}>
                                    <NativeSelect
                                      value={person.position}
                                      onChange={(event) =>
                                        patch({
                                          personnel: unit.personnel.map(
                                            (item) =>
                                              item.id === person.id
                                                ? {
                                                    ...item,
                                                    position:
                                                      event.target.value,
                                                  }
                                                : item,
                                          ),
                                        })
                                      }
                                    >
                                      <option value="">ไม่ระบุ</option>
                                      {person.position && !personnelProfileOptions.positions.includes(person.position) ? <option value={person.position}>{person.position} (ข้อมูลเดิม)</option> : null}
                                      {personnelProfileOptions.positions.map((position) => <option key={position} value={position}>{position}</option>)}
                                    </NativeSelect>
                                  </EditorField>
                                  <EditorField label="ระดับ" dirty={changed(person.level, savedPerson?.level)}>
                                    <NativeSelect
                                      value={person.level ?? ""}
                                      onChange={(event) => patch({ personnel: unit.personnel.map((item) => item.id === person.id ? { ...item, level: event.target.value } : item) })}
                                    >
                                      <option value="">ไม่ระบุ</option>
                                      {person.level && !personnelProfileOptions.levels.includes(person.level) ? <option value={person.level}>{person.level} (ข้อมูลเดิม)</option> : null}
                                      {personnelProfileOptions.levels.map((level) => <option key={level} value={level}>{level}</option>)}
                                    </NativeSelect>
                                  </EditorField>
                                </div>
                                <EditorField label="ความเชี่ยวชาญ / หน้าที่รับผิดชอบ" dirty={changed(person.expertise, savedPerson?.expertise)}>
                                  <input
                                    value={person.expertise}
                                    onChange={(event) =>
                                      patch({
                                        personnel: unit.personnel.map((item) =>
                                          item.id === person.id
                                            ? {
                                                ...item,
                                                expertise: event.target.value,
                                              }
                                            : item,
                                        ),
                                      })
                                    }
                                  />
                                </EditorField>
                                <div className="unit-person-contact-fields">
                                  <EditorField label="โทรศัพท์" dirty={changed(person.phone, savedPerson?.phone)}>
                                    <input
                                      value={person.phone}
                                      inputMode="numeric"
                                      maxLength={10}
                                      onChange={(event) =>
                                        patch({
                                          personnel: unit.personnel.map(
                                            (item) =>
                                              item.id === person.id
                                                ? {
                                                    ...item,
                                                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                                                  }
                                                : item,
                                          ),
                                        })
                                      }
                                    />
                                  </EditorField>
                                  <EditorField label="ต่อ (ถ้ามี)" dirty={changed(person.phoneExtension, savedPerson?.phoneExtension)}>
                                    <input
                                      value={person.phoneExtension}
                                      inputMode="numeric"
                                      maxLength={6}
                                      onChange={(event) => patch({ personnel: unit.personnel.map((item) => item.id === person.id ? { ...item, phoneExtension: event.target.value.replace(/\D/g, "").slice(0, 6) } : item) })}
                                    />
                                  </EditorField>
                                  <EditorField label="อีเมล" dirty={changed(person.email, savedPerson?.email)}>
                                    <input
                                      value={person.email}
                                      onChange={(event) =>
                                        patch({
                                          personnel: unit.personnel.map(
                                            (item) =>
                                              item.id === person.id
                                                ? {
                                                    ...item,
                                                    email: event.target.value,
                                                  }
                                                : item,
                                          ),
                                        })
                                      }
                                    />
                                  </EditorField>
                                </div></> : <EditorField label="ความเชี่ยวชาญ / หน้าที่รับผิดชอบ" dirty={changed(person.expertise, savedPerson?.expertise)}><input value={person.expertise} onChange={(event) => patch({ personnel: unit.personnel.map((item) => item.id === person.id ? { ...item, expertise: event.target.value } : item) })}/></EditorField>}
                              </>
                            )}
                          </article>
                    );
                  })}
              {!unit.personnel.length ? <div className="unit-personnel-empty">ยังไม่มีบุคลากรในกลุ่มงาน<br/>กด “เพิ่มบุคลากร” เพื่อเริ่มต้น</div> : null}
            </div>
          </div>
        ) : tab === "layout" ? (
          <DragDropContext onDragEnd={reorderSections}>
            <Droppable droppableId="unit-sections" direction="vertical">
              {(drop) => (
                <div
                  className="unit-layout-list"
                  ref={drop.innerRef}
                  {...drop.droppableProps}
                >
                  {unit.sectionOrder.map((section, index) => (
                    <Draggable
                      key={section}
                      draggableId={`unit-section-${section}`}
                      index={index}
                    >
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={snapshot.isDragging ? "dragging" : ""}
                        >
                          <span
                            className="unit-layout-drag"
                            {...drag.dragHandleProps}
                            aria-label={`ลากเพื่อจัดลำดับ ${unitSectionLabels[section]}`}
                          >
                            <GripVertical size={17} />
                          </span>
                          <span className="unit-layout-name">
                            <strong>{unitSectionLabels[section]} <UnsavedBadge show={changed([unit.sectionOrder.indexOf(section), unit.sectionVisibility[section], unit.sectionBackground[section]], [badgeUnit.sectionOrder.indexOf(section), badgeUnit.sectionVisibility[section], badgeUnit.sectionBackground[section]])}/></strong>
                            <small>
                              {section === "posts" || section === "documents"
                                ? "ดึงข้อมูลจากระบบอัตโนมัติ"
                                : "ข้อมูลจากหน้ากลุ่มงาน"}
                            </small>
                          </span>
                          <span className="unit-layout-actions">
                            <button
                              type="button"
                              role="switch"
                              aria-label={`พื้นหลังสี ${unitSectionLabels[section]}`}
                              aria-checked={unit.sectionBackground[section]}
                              className={`unit-visibility-switch ${unit.sectionBackground[section] ? "active" : ""}`}
                              onClick={() =>
                                patch({
                                  sectionBackground: {
                                    ...unit.sectionBackground,
                                    [section]: !unit.sectionBackground[section],
                                  },
                                })
                              }
                            >
                              <span />
                              <b>พื้นหลัง</b>
                            </button>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={unit.sectionVisibility[section]}
                              className={`unit-visibility-switch ${unit.sectionVisibility[section] ? "active" : ""}`}
                              onClick={() =>
                                patch({
                                  sectionVisibility: {
                                    ...unit.sectionVisibility,
                                    [section]: !unit.sectionVisibility[section],
                                  },
                                })
                              }
                            >
                              <span />
                              <b>
                                {unit.sectionVisibility[section]
                                  ? "แสดง"
                                  : "ซ่อน"}
                              </b>
                            </button>
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {drop.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : null}
      </div>
      {coverPickerOpen ? (
        <MediaPicker
          open
          acceptKind="image"
          currentId={unit.coverMediaId}
          onClose={() => setCoverPickerOpen(false)}
          onSelect={(item) => {
            patch({
              coverMediaId: item.id,
              coverImageUrl: null,
              coverFocus: { x: 50, y: 50, zoom: 1 },
            });
            setCoverPickerOpen(false);
          }}
        />
      ) : null}
      {personPickerId ? (
        <MediaPicker
          open
          currentId={
            unit.personnel.find((person) => person.id === personPickerId)
              ?.mediaId ?? null
          }
          onClose={() => setPersonPickerId(null)}
          onSelect={(item) => {
            patch({
              personnel: unit.personnel.map((person) =>
                person.id === personPickerId
                  ? { ...person, mediaId: item.id }
                  : person,
              ),
            });
            setPersonPickerId(null);
          }}
        />
      ) : null}
      </div>
      {confirmAction ? (
        <UnitSaveConfirmDialog
          action={confirmAction}
          name={unit.name || "กลุ่มงานใหม่"}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => persist(confirmAction === "publish")}
        />
      ) : null}
      {confirmUnpublish ? <ConfirmDialog title="ยกเลิกเผยแพร่กลุ่มงาน?" description={`“${unit.name}” จะไม่แสดงบนเว็บไซต์ การแก้ไขที่ยังไม่ได้บันทึกในฟอร์มจะหายไป`} confirmLabel="ยกเลิกเผยแพร่" pending={unpublishPending} onClose={() => setConfirmUnpublish(false)} onConfirm={() => { void unpublish(); }}/> : null}
      {pendingLeaveHref ? <ConfirmDialog
        title="ออกจากหน้าหน่วยงานโดยไม่บันทึก?"
        description="การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป หากต้องการเก็บงานไว้ ให้ยกเลิกแล้วกดบันทึกร่างก่อนออกจากหน้า"
        confirmLabel="ออกโดยไม่บันทึก"
        onClose={() => setPendingLeaveHref(null)}
        onConfirm={() => {
          const destination = new URL(pendingLeaveHref);
          allowLeaveRef.current = true;
          setPendingLeaveHref(null);
          if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`);
          else window.location.assign(destination.href);
        }}
      /> : null}
      {deleteMissionId ? <ConfirmDialog
        title={`ลบพันธกิจข้อ ${(unit.missionItems?.findIndex((item) => item.id === deleteMissionId) ?? -1) + 1}?`}
        description="พันธกิจข้อนี้จะถูกนำออกจากรายการ การเปลี่ยนแปลงจะมีผลเมื่อบันทึกกลุ่มงาน"
        confirmLabel="ลบพันธกิจ"
        onClose={() => setDeleteMissionId(null)}
        onConfirm={() => { patch({ missionItems: unit.missionItems?.filter((item) => item.id !== deleteMissionId) ?? [] }); setDeleteMissionId(null); }}
      /> : null}
      {deletePersonId && unit.personnel.some((person) => person.id === deletePersonId) ? <ConfirmDialog
        title={`นำ “${unit.personnel.find((person) => person.id === deletePersonId)?.name || "บุคลากรรายนี้"}” ออกจากกลุ่มงาน?`}
        description="บุคลากรรายนี้จะถูกนำออกจากหน้ากลุ่มงานเมื่อบันทึกการเปลี่ยนแปลง หากเชื่อมกับโปรไฟล์ผู้ใช้ บัญชีและโปรไฟล์จะไม่ถูกลบ"
        confirmLabel="นำออกจากกลุ่มงาน"
        onClose={() => setDeletePersonId(null)}
        onConfirm={() => {
          patch({ personnel: unit.personnel.filter((person) => person.id !== deletePersonId) });
          if (selectedPersonId === deletePersonId) setSelectedPersonId(null);
          setDeletePersonId(null);
        }}
      /> : null}
      {discardConfirmOpen ? <ConfirmDialog title="ทิ้งฉบับร่างที่ยังไม่เผยแพร่?" description="การเปลี่ยนแปลงที่บันทึกเป็นร่าง รวมถึงสิทธิ์เข้าถึง และข้อมูลที่ยังแก้ค้างอยู่ในฟอร์มจะถูกลบ ฟอร์มจะกลับไปตรงกับฉบับเผยแพร่ล่าสุด โดยหน้าเว็บไซต์ไม่เปลี่ยน" confirmLabel="ทิ้งฉบับร่าง" pending={discardPending} onClose={() => { if (!discardPending) setDiscardConfirmOpen(false); }} onConfirm={() => { void discardSavedDraft(); }}/> : null}
      {deleteService ? <ConfirmDialog
        title={`ลบ${deleteService.kind === "group" ? "หมวดบริการ" : "ลิงก์"} “${deleteService.label}”?`}
        description={deleteService.kind === "group" ? "ลิงก์ทั้งหมดในหมวดนี้จะถูกนำออกด้วย การเปลี่ยนแปลงจะมีผลเมื่อบันทึกกลุ่มงาน" : "ลิงก์นี้จะถูกนำออกจากหมวดบริการ การเปลี่ยนแปลงจะมีผลเมื่อบันทึกกลุ่มงาน"}
        confirmLabel={deleteService.kind === "group" ? "ลบหมวด" : "ลบลิงก์"}
        onClose={() => setDeleteService(null)}
        onConfirm={confirmServiceDelete}
      /> : null}
      {accessDialogOpen ? <AccessControlDialog
        initialLevel={unit.accessLevel}
        initialGrants={unit.accessGrants}
        options={accessOptions}
        onClose={() => setAccessDialogOpen(false)}
        onSave={(accessLevel, accessGrants) => { if (accessLevel !== unit.accessLevel || JSON.stringify(accessGrants) !== JSON.stringify(unit.accessGrants)) patch({ accessLevel, accessGrants }); }}
      /> : null}
      {personnelAddOpen ? <PersonnelAddDialog
        profiles={personnelProfiles.filter((profile) => profile.unitIds.includes(unit.id) && !unit.personnel.some((person) => person.userId === profile.id))}
        isNewUnit={!unitId}
        onClose={() => setPersonnelAddOpen(false)}
        onAddManual={() => {
          const id = createId();
          patch({ personnel: [...unit.personnel, { id, userId: null, name: "", position: "", level: "", expertise: "", phone: "", phoneExtension: "", email: "", mediaId: null, photoFocus: { x: 50, y: 25 } }] });
          setSelectedPersonId(id);
          setPersonnelAddOpen(false);
        }}
        onAddProfile={(profile) => {
          const id = createId();
          patch({ personnel: [...unit.personnel, { id, userId: profile.id, name: profile.name, position: profile.position, expertise: "", phone: profile.phone, phoneExtension: profile.phoneExtension, email: profile.email, mediaId: profile.mediaId, photoFocus: profile.photoFocus }] });
          setSelectedPersonId(id);
          setPersonnelAddOpen(false);
        }}
      /> : null}
    </>
  );
}

function UnitSaveConfirmDialog({
  action,
  name,
  onClose,
  onConfirm,
}: {
  action: "draft" | "publish";
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const publish = action === "publish";
  return (
    <div className="builder-modal-layer">
      <button
        className="builder-modal-backdrop"
        aria-label="ปิดหน้าต่างยืนยัน"
        onClick={onClose}
      />
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <header>
          <strong>
            {publish ? "ยืนยันการเผยแพร่กลุ่มงาน" : "ยืนยันการบันทึกร่าง"}
          </strong>
          <button type="button" aria-label="ปิด" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <p>
          {publish
            ? `ต้องการเผยแพร่ “${name}” ให้แสดงบนเว็บไซต์ใช่หรือไม่`
            : `ต้องการบันทึกข้อมูล “${name}” เป็นฉบับร่างใช่หรือไม่`}
        </p>
        <footer>
          <button type="button" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            {publish ? "ยืนยันเผยแพร่" : "ยืนยันบันทึก"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PersonnelAddDialog({ profiles, isNewUnit, onClose, onAddManual, onAddProfile }: {
  profiles: PersonnelProfileOption[];
  isNewUnit: boolean;
  onClose: () => void;
  onAddManual: () => void;
  onAddProfile: (profile: PersonnelProfileOption) => void;
}) {
  const [mode, setMode] = useState<"manual" | "system">("manual");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const visible = profiles.filter((profile) => `${profile.name} ${profile.position}`.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th")));
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;
  return <div className="builder-modal-layer">
    <button type="button" className="builder-modal-backdrop" aria-label="ปิดหน้าต่างเพิ่มบุคลากร" onClick={onClose}/>
    <section className="personnel-add-dialog" role="dialog" aria-modal="true" aria-labelledby="personnel-add-title">
      <header><div><h2 id="personnel-add-title">เพิ่มบุคลากร</h2><p>เลือกวิธีเพิ่มข้อมูลบุคลากรในหน้ากลุ่มงาน</p></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={18}/></button></header>
      <div className="personnel-add-body">
        <div className="personnel-add-modes">
          <button type="button" className={mode === "manual" ? "selected" : ""} onClick={() => setMode("manual")}><span><PenLine size={20}/></span><div><strong>กรอกข้อมูลเอง</strong><small>เพิ่มชื่อ ตำแหน่ง รูป และข้อมูลติดต่อเฉพาะหน้านี้</small></div></button>
          <button type="button" className={mode === "system" ? "selected" : ""} onClick={() => setMode("system")}><span><UserRoundPlus size={20}/></span><div><strong>ใช้ผู้ใช้ในระบบ</strong><small>เชื่อมข้อมูลกับโปรไฟล์และอัปเดตอัตโนมัติ</small></div></button>
        </div>
        {mode === "manual" ? <div className="personnel-add-note">ระบบจะสร้างรายการว่างให้กรอกข้อมูลและเลือกรูปจากคลังสื่อ</div> : <div className="personnel-system-picker">
          <label><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือตำแหน่ง..." autoFocus/></label>
          <div className="personnel-profile-list">{visible.length ? visible.map((profile) => <button type="button" key={profile.id} className={selectedId === profile.id ? "selected" : ""} onClick={() => setSelectedId(profile.id)}><span className="personnel-profile-avatar">{profile.name.slice(0, 1)}</span><span><strong>{profile.name}</strong><small>{profile.position || "ไม่ระบุตำแหน่ง"}</small></span><i>{selectedId === profile.id ? "✓" : ""}</i></button>) : <div className="personnel-profile-empty"><UserRoundPlus size={24}/><strong>{isNewUnit ? "ยังเลือกผู้ใช้ไม่ได้" : "ไม่พบบุคลากรในกลุ่มงานนี้"}</strong><p>{isNewUnit ? "บันทึกกลุ่มงานก่อน แล้วกำหนดสังกัดให้ผู้ใช้จากหน้าบัญชีผู้ใช้งาน" : "ผู้ใช้ต้องมีสังกัดอยู่ในกลุ่มงานนี้และยังไม่ถูกเพิ่มในรายการ"}</p></div>}</div>
        </div>}
      </div>
      <footer><button type="button" onClick={onClose}>ยกเลิก</button><button type="button" className="primary-button" disabled={mode === "system" && !selected} onClick={() => mode === "manual" ? onAddManual() : selected && onAddProfile(selected)}>เพิ่มบุคลากร</button></footer>
    </section>
  </div>;
}
function EditorField({
  label,
  children,
  dirty = false,
}: {
  label: string;
  children: React.ReactNode;
  dirty?: boolean;
}) {
  return (
    <label className="unit-field">
      <span>{label} <UnsavedBadge show={dirty}/></span>
      {children}
    </label>
  );
}

function UnsavedBadge({ show }: { show: boolean }) {
  return show ? <span className="splash-draft-field-badge">ยังไม่เผยแพร่</span> : null;
}

function UnitServiceIconPicker({ value, dirty, onChange }: { value: UnitServiceGroup["icon"]; dirty: boolean; onChange: (value: UnitServiceGroup["icon"]) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedName = unitServiceIconName(value);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
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
  return <div className="navigation-icon-field unit-service-icon-field">
    <span>ไอคอน <UnsavedBadge show={dirty}/></span>
    <details ref={detailsRef} className="navigation-icon-picker" onKeyDown={(event) => {
      if (event.key === "Escape") { detailsRef.current?.removeAttribute("open"); detailsRef.current?.querySelector("summary")?.focus(); }
    }}>
      <summary><span><NavigationIcon name={selectedName} size={18}/>{navigationIcons[selectedName].label}</span><ChevronDown size={17}/></summary>
      <div className="navigation-icon-grid unit-service-icon-grid" aria-label="เลือกไอคอนหมวดบริการ">
        {navigationIconNames.map((name: NavigationIconName) => <button key={name} type="button" className={selectedName === name ? "selected" : ""} aria-label={navigationIcons[name].label} aria-pressed={selectedName === name} title={navigationIcons[name].label} onClick={() => { onChange(name); detailsRef.current?.removeAttribute("open"); }}><NavigationIcon name={name} size={21}/><small>{navigationIcons[name].label}</small></button>)}
      </div>
    </details>
  </div>;
}

const serviceModules = selectableModuleRoutes;

function serviceTargetSummary(target: LinkTarget, pages: DemoPageSummary[], units: DemoUnit[]) {
  if (target.kind === "external") return `เว็บไซต์ภายนอก · ${target.url}`;
  if (target.kind === "module") return `ส่วนหลักของเว็บไซต์ · ${moduleRouteCatalog[target.module].label}`;
  if (target.entity === "page") {
    const page = pages.find((entry) => entry.id === target.id);
    return page ? `หน้าเว็บไซต์ · ${page.name} · /${page.path}` : "หน้าเว็บไซต์ · ไม่พบหน้าเป้าหมาย";
  }
  const unit = units.find((entry) => entry.id === target.id);
  return unit ? `หน่วยงาน · ${unit.shortName || unit.name} · /units/${unit.slug}` : "หน่วยงาน · ไม่พบหน่วยงานเป้าหมาย";
}

function UnitServiceTargetFields({
  target,
  dirty,
  pages: allPages,
  openInNewTab,
  onChange,
}: {
  target: LinkTarget;
  dirty: boolean;
  pages: DemoPageSummary[];
  openInNewTab: boolean;
  onChange: (target: LinkTarget, openInNewTab: boolean) => void;
}) {
  const pages = allPages.filter((page) => !page.locked);
  const units = readUnits(true);
  const firstEntity: LinkTarget | null = pages[0]
    ? { kind: "entity", entity: "page", id: pages[0].id }
    : units[0]
      ? { kind: "entity", entity: "unit", id: units[0].id }
      : null;
  return (
    <div className="unit-service-target-fields">
      <EditorField label="ประเภทปลายทาง" dirty={dirty}>
        <NativeSelect
          value={target.kind}
          onChange={(event) => {
            const kind = event.target.value;
            onChange(
              kind === "external"
                ? { kind: "external", url: "https://" }
                : kind === "entity" && firstEntity
                  ? firstEntity
                  : { kind: "module", module: "home" },
              openInNewTab,
            );
          }}
        >
          <option value="module">ส่วนหลักของเว็บไซต์</option>
          <option value="entity" disabled={!firstEntity}>หน้าเว็บไซต์หรือหน่วยงาน</option>
          <option value="external">เว็บไซต์ภายนอก</option>
        </NativeSelect>
      </EditorField>
      {target.kind === "external" ? (
        <EditorField label="URL ภายนอก">
          <input
            value={target.url}
            onChange={(event) =>
              onChange(
                { kind: "external", url: event.target.value },
                openInNewTab,
              )
            }
            placeholder="https://example.com"
          />
        </EditorField>
      ) : target.kind === "module" ? (
        <EditorField label="หน้าปลายทาง">
          <NativeSelect
            value={target.module}
            onChange={(event) =>
              onChange(
                {
                  kind: "module",
                  module: event.target.value as Extract<
                    LinkTarget,
                    { kind: "module" }
                  >["module"],
                },
                openInNewTab,
              )
            }
          >
            {!moduleRouteCatalog[target.module].selectable ? <option value={target.module} disabled>{moduleRouteCatalog[target.module].label} (ปลายทางเดิม)</option> : null}
            {serviceModules.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </NativeSelect>
        </EditorField>
      ) : (
        <EditorField label="หน้าเป้าหมาย">
          <AnchoredSelect
            className="entity-target-select"
            label="หน้าเป้าหมาย"
            value={`${target.entity}:${target.id}`}
            options={[
              ...pages.map((page) => ({ value: `page:${page.id}`, label: page.name, description: `/${page.path}`, group: "หน้าเว็บไซต์" })),
              ...units.map((unit) => ({ value: `unit:${unit.id}`, label: unit.name, description: `/units/${unit.slug}`, group: "หน่วยงานและกลุ่มงาน" })),
            ]}
            onChange={(value) => {
              const [entity, id] = value.split(":");
              if (entity && id) onChange({ kind: "entity", entity: entity as "page" | "unit", id }, openInNewTab);
            }}
          />
        </EditorField>
      )}
    </div>
  );
}
