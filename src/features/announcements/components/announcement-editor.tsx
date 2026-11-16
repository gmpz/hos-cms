"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Image as ImageIcon, ImagePlus, LayoutTemplate, Megaphone, RotateCcw, Settings2, Type } from "lucide-react";
import { showGlobalToast } from "@/components/ui/global-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { AnchoredSelect } from "@/components/ui/anchored-select";
import { MediaPicker } from "@/features/media/components/media-picker";
import type { DemoMediaItem } from "@/features/media/demo/media-items";
import { pagesChangeEvent, readPageSummaries, refreshPageSummaries } from "@/features/pages/demo/page-list-storage";
import { readUnits, refreshUnits } from "@/features/units/demo/storage";
import { selectableModuleRoutes } from "@/features/navigation/module-routes";
import type { AnnouncementDto, ModalSnapshot } from "@/features/announcements/types";
import { AnnouncementRichTextEditor } from "./announcement-rich-text-editor";
import { AnnouncementPublicationActions } from "./announcement-publication-actions";
import { announcementPlainText } from "../announcement-content";

const titleLimit = 80;
const savedAtFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
type DestinationKind = "none" | "module" | "entity" | "external" | "legacy";
type EntityTarget = { id: string; label: string; entity: "page" | "unit"; path: string };

function moduleUrl(href: string): string { return href.startsWith("#") ? `/${href}` : href; }
function destinationKind(url: string, targets: EntityTarget[]): DestinationKind {
  if (!url) return "none";
  if (selectableModuleRoutes.some((route) => moduleUrl(route.href) === url)) return "module";
  if (targets.some((target) => target.path === url)) return "entity";
  return /^https?:\/\//i.test(url) ? "external" : "legacy";
}
function readEntityTargets(): EntityTarget[] {
  return [
    ...readPageSummaries().filter((page) => !page.locked).map((page) => ({ id: page.id, label: page.name, entity: "page" as const, path: `/${page.path}` })),
    ...readUnits().map((unit) => ({ id: unit.id, label: unit.shortName || unit.name, entity: "unit" as const, path: `/units/${unit.slug}` })),
  ];
}

type Form = Omit<AnnouncementDto, "id" | "imageUrl" | "status" | "revision" | "publishedAt" | "deletedAt" | "updatedAt" | "allowSuppression" | "repeatAfterDays" | "splashFrequency" | "splashIntervalHours" | "splashCookieVersion" | "modalCookieVersion" | "hasUnpublishedChanges" | "publishedSplash" | "publishedModal">;

const emptyForm = (): Form => ({
  title: "", description: "", displayMode: "MODAL", contentMode: "TEXT", imageMediaId: null,
  imageAlt: "", buttonLabel: "", buttonUrl: "", openInNewTab: false,
  modalFrequency: "ONCE_PER_CAMPAIGN", modalIntervalHours: 24, startsAt: null, endsAt: null, priority: 0,
});

function formFrom(item?: AnnouncementDto): Form {
  if (!item) return emptyForm();
  return {
    title: item.title, description: item.description, displayMode: item.displayMode, contentMode: item.contentMode,
    imageMediaId: item.imageMediaId, imageAlt: item.imageAlt, buttonLabel: item.buttonLabel,
    buttonUrl: item.buttonUrl, openInNewTab: item.openInNewTab,
    modalFrequency: item.modalFrequency ?? "ONCE_PER_CAMPAIGN", modalIntervalHours: item.modalIntervalHours ?? 24,
    startsAt: item.startsAt, endsAt: item.endsAt, priority: item.priority,
  };
}

const changeLabels: { key: keyof ModalSnapshot; label: string }[] = [
  { key: "title", label: "หัวข้อ" }, { key: "description", label: "ข้อความ" },
  { key: "contentMode", label: "รูปแบบ" }, { key: "imageMediaId", label: "รูปภาพ" },
  { key: "imageAlt", label: "คำอธิบายรูป" }, { key: "buttonLabel", label: "ข้อความปุ่ม" },
  { key: "buttonUrl", label: "ลิงก์ปุ่ม" }, { key: "openInNewTab", label: "การเปิดลิงก์" },
  { key: "modalFrequency", label: "การแสดงซ้ำ" }, { key: "modalIntervalHours", label: "จำนวนชั่วโมง" },
  { key: "priority", label: "ลำดับการแสดงผล" },
];

export function AnnouncementEditor({ item }: { item?: AnnouncementDto }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => formFrom(item));
  const [priorityInput, setPriorityInput] = useState(() => String(item?.priority ?? 0));
  const [savedDraft, setSavedDraft] = useState<Form>(() => formFrom(item));
  const [targetKind, setTargetKind] = useState<DestinationKind>(() => destinationKind(item?.buttonUrl ?? "", []));
  const [entityTargets, setEntityTargets] = useState<EntityTarget[]>([]);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? null);
  const [savedImageUrl, setSavedImageUrl] = useState(item?.imageUrl ?? null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(item?.revision ?? 0);
  const [status, setStatus] = useState(item?.status ?? "DRAFT");
  const [lastSavedAt, setLastSavedAt] = useState(item?.updatedAt ?? null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(item?.hasUnpublishedChanges ?? false);
  const [publishedModal, setPublishedModal] = useState(item?.publishedModal ?? null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const busyRef = useRef(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const allowLeaveRef = useRef(false);
  const selectedEntity = entityTargets.find((target) => target.path === form.buttonUrl);
  const selectedTargetKind = targetKind === "legacy" && selectedEntity ? "entity" : targetKind;
  const hasSavedDraft = Boolean(item) && (status !== "PUBLISHED" || hasUnpublishedChanges);
  const savedBaseline = status === "PUBLISHED" && publishedModal ? publishedModal : emptyForm();
  const savedChanges = hasSavedDraft
    ? changeLabels.filter(({ key }) => savedDraft[key] !== savedBaseline[key]) : [];
  const unsavedChanges = changeLabels.filter(({ key }) => form[key] !== savedDraft[key]);
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(savedDraft);
  const shouldWarnOnLeave = !item || hasUnsavedChanges;
  const savedChange = (key: keyof ModalSnapshot) => savedChanges.some((change) => change.key === key);
  const unsavedChange = (key: keyof ModalSnapshot) => unsavedChanges.some((change) => change.key === key);
  const changedBadge = (key: keyof ModalSnapshot) => unsavedChange(key)
    ? <span className="splash-draft-field-badge">ยังไม่บันทึก</span>
    : savedChange(key) ? <span className="splash-draft-field-badge">ยังไม่เผยแพร่</span> : null;

  function restoreSavedForm() {
    setForm(savedDraft);
    setPriorityInput(String(savedDraft.priority));
    setTargetKind(destinationKind(savedDraft.buttonUrl, entityTargets));
    setImageUrl(savedImageUrl);
    setMediaOpen(false);
  }

  useEffect(() => () => { allowLeaveRef.current = false; }, []);

  useEffect(() => {
    const refreshTargets = () => setEntityTargets(readEntityTargets());
    refreshTargets();
    window.addEventListener(pagesChangeEvent, refreshTargets);
    window.addEventListener("hos-units-change", refreshTargets);
    void refreshPageSummaries().catch(() => undefined);
    void refreshUnits().catch(() => undefined);
    return () => {
      window.removeEventListener(pagesChangeEvent, refreshTargets);
      window.removeEventListener("hos-units-change", refreshTargets);
    };
  }, []);

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
      if (!(["http:", "https:"].includes(destination.protocol)) || destination.href === window.location.href) return;
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

  function changeDestination(kind: DestinationKind) {
    setTargetKind(kind);
    const buttonUrl = kind === "module" ? moduleUrl(selectableModuleRoutes[0].href)
      : kind === "entity" ? entityTargets[0]?.path ?? "" : "";
    setForm((current) => ({ ...current, buttonUrl }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-action") === "publish";
    if (publish) {
      setConfirmPublish(true);
      return;
    }
    await persist(false);
  }

  async function persist(publish: boolean) {
    if (busyRef.current) return;
    if (!form.title.trim() || form.title.trim().length > titleLimit || (form.contentMode === "TEXT" && !announcementPlainText(form.description)) || (form.contentMode === "IMAGE" && (!form.imageMediaId || !form.imageAlt.trim()))) {
      showGlobalToast({ title: "กรอกข้อมูลไม่ครบ", description: "กรุณาตรวจสอบหัวข้อและเนื้อหาประกาศ", variant: "error" });
      return;
    }
    if (!Number.isSafeInteger(form.modalIntervalHours) || form.modalIntervalHours < 1 || form.modalIntervalHours > 8760) {
      showGlobalToast({ title: "จำนวนชั่วโมงไม่ถูกต้อง", description: "กรุณาระบุ 1–8,760 ชั่วโมง", variant: "error" });
      return;
    }
    if (selectedTargetKind !== "none" && (!form.buttonUrl.trim() || !form.buttonLabel.trim())) {
      showGlobalToast({ title: "กรอกข้อมูลปุ่มไม่ครบ", description: "กรุณาเลือกปลายทางและกรอกข้อความบนปุ่ม", variant: "error" });
      return;
    }
    if ((selectedTargetKind === "external" && !/^https?:\/\//i.test(form.buttonUrl)) ||
      (selectedTargetKind === "legacy" && (!form.buttonUrl.startsWith("/") || form.buttonUrl.startsWith("//")))) {
      showGlobalToast({ title: "ลิงก์ไม่ถูกต้อง", description: selectedTargetKind === "external" ? "เว็บไซต์ภายนอกต้องเริ่มด้วย http:// หรือ https://" : "ลิงก์ภายในต้องเริ่มด้วย /", variant: "error" });
      return;
    }
    busyRef.current = true;
    setPending(true);
    try {
      const response = await fetch(item ? `/api/announcements/${item.id}` : "/api/announcements", {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item ? { data: form, revision, publish } : { data: form, publish }),
      });
      const result = await response.json() as AnnouncementDto | { error: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "บันทึกไม่สำเร็จ");
      if (!("id" in result)) throw new Error("ไม่พบข้อมูลประกาศที่บันทึก");
      setRevision(result.revision);
      setStatus(result.status);
      setLastSavedAt(result.updatedAt);
      setHasUnpublishedChanges(result.hasUnpublishedChanges);
      setPublishedModal(result.publishedModal);
      const savedForm = formFrom(result);
      setForm(savedForm);
      setPriorityInput(String(savedForm.priority));
      setSavedDraft(savedForm);
      setTargetKind(destinationKind(result.buttonUrl, entityTargets));
      setImageUrl(result.imageUrl);
      setSavedImageUrl(result.imageUrl);
      if (publish) setConfirmPublish(false);
      showGlobalToast({ title: publish ? "เผยแพร่แล้ว" : "บันทึกร่างแล้ว", description: publish ? "ประกาศแสดงบนเว็บไซต์แล้ว" : status === "PUBLISHED" ? "ร่างที่บันทึกไว้ยังไม่แสดงบนเว็บไซต์ กดเผยแพร่เมื่อต้องการใช้" : "บันทึกประกาศเรียบร้อย" });
      if (!item) { allowLeaveRef.current = true; router.replace(`/admin/announcements/${result.id}/edit`); }
      router.refresh();
    } catch (error) {
      showGlobalToast({ title: publish ? "เผยแพร่ไม่สำเร็จ" : "บันทึกไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  async function unpublish() {
    if (!item || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    try {
      const response = await fetch(`/api/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish", revision }),
      });
      const result = await response.json() as AnnouncementDto | { error: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "ยกเลิกเผยแพร่ไม่สำเร็จ");
      if (!("id" in result)) throw new Error("ไม่พบข้อมูลประกาศ");
      setRevision(result.revision);
      setStatus(result.status);
      setLastSavedAt(result.updatedAt);
      setHasUnpublishedChanges(result.hasUnpublishedChanges);
      setConfirmUnpublish(false);
      showGlobalToast({ title: "ยกเลิกเผยแพร่แล้ว", description: "ประกาศนี้ไม่แสดงบนเว็บไซต์แล้ว" });
      router.refresh();
    } catch (error) {
      showGlobalToast({ title: "ยกเลิกเผยแพร่ไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  async function discardDraft() {
    if (!item || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    try {
      const response = await fetch(`/api/announcements/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discard-draft", revision }) });
      const result = await response.json() as AnnouncementDto | { error: string };
      if (!response.ok || !("id" in result)) throw new Error("error" in result ? result.error : "ยกเลิกร่างไม่สำเร็จ");
      setRevision(result.revision);
      setLastSavedAt(result.updatedAt);
      const restoredForm = formFrom(result);
      setForm(restoredForm);
      setPriorityInput(String(restoredForm.priority));
      setSavedDraft(restoredForm);
      setTargetKind(destinationKind(result.buttonUrl, entityTargets));
      setImageUrl(result.imageUrl);
      setSavedImageUrl(result.imageUrl);
      setHasUnpublishedChanges(false);
      setPublishedModal(result.publishedModal);
      setConfirmDiscard(false);
      showGlobalToast({ title: "ยกเลิกร่างแล้ว", description: "กลับไปใช้ข้อมูลฉบับที่เผยแพร่" });
      router.refresh();
    } catch (error) {
      showGlobalToast({ title: "ยกเลิกร่างไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" });
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  return <div className="announcement-edit-page">
    <Link className="announcement-edit-back" href="/admin/announcements"><ArrowLeft size={16}/>ย้อนกลับ</Link>
    <header className="announcement-edit-heading">
      <div className="announcement-edit-title"><div><h1>{item ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}</h1><p>{item ? "ปรับเนื้อหาและลำดับการแสดงผล" : "เตรียมประกาศสำหรับผู้เข้าชมหน้าสาธารณะ"}</p></div></div>
      <AnnouncementPublicationActions formId="announcement-form" published={status === "PUBLISHED"} existing={Boolean(item)} unsaved={hasUnsavedChanges} savedDraft={hasUnpublishedChanges} pending={pending} onUnpublish={() => setConfirmUnpublish(true)}/>
    </header>
    {(shouldWarnOnLeave || hasSavedDraft) ? <section className="splash-draft-notice" aria-live="polite">
      <div>
        <strong>{hasUnsavedChanges ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : !item ? "ประกาศนี้ยังไม่ได้บันทึก" : hasUnpublishedChanges ? "มีร่างที่บันทึกแล้ว ยังไม่ได้เผยแพร่" : "บันทึกร่างแล้ว ยังไม่ได้เผยแพร่"}</strong>
        {hasSavedDraft && lastSavedAt ? <p>บันทึกล่าสุด {savedAtFormat.format(new Date(lastSavedAt))} · {status === "PUBLISHED" ? "หน้าเว็บไซต์ยังแสดงฉบับเดิม" : "ประกาศนี้ยังไม่แสดงบนเว็บไซต์"}</p> : null}
      </div>
      {status === "PUBLISHED" && hasUnpublishedChanges ? <button type="button" disabled={pending} onClick={() => setConfirmDiscard(true)}><RotateCcw size={16}/>ยกเลิกร่างที่บันทึก</button> : null}
    </section> : null}
    <form id="announcement-form" className="announcement-edit-form" onSubmit={(event) => void save(event)}>
      <section className="announcement-edit-card announcement-content-card">
        <header><span className="announcement-card-icon"><LayoutTemplate size={19}/></span><div><h2>เนื้อหาประกาศ</h2><p>เลือกรูปแบบและกรอกข้อมูลที่ผู้เข้าชมจะเห็น</p></div></header>
        <div className="announcement-editor-body">
          <label className="announcement-title-field"><span>หัวข้อประกาศ <em>*</em> {changedBadge("title")}</span><input required maxLength={titleLimit} placeholder="เช่น แจ้งปิดให้บริการชั่วคราว" value={form.title} onChange={(event) => setForm({...form,title:event.target.value})}/><small>{form.title.length}/{titleLimit}</small></label>
          <div className="announcement-option-row"><fieldset><legend>ใช้เนื้อหาประเภทใด {changedBadge("contentMode")}</legend><div className="announcement-choice-grid"><button type="button" aria-pressed={form.contentMode === "TEXT"} className={form.contentMode === "TEXT" ? "active" : ""} onClick={() => setForm({...form,contentMode:"TEXT"})}><span><Type/></span><span><strong>ข้อความ</strong><small>เหมาะกับประกาศสั้น</small></span>{form.contentMode === "TEXT" ? <Check className="choice-check"/> : null}</button><button type="button" aria-pressed={form.contentMode === "IMAGE"} className={form.contentMode === "IMAGE" ? "active" : ""} onClick={() => setForm({...form,contentMode:"IMAGE"})}><span><ImageIcon/></span><span><strong>รูปภาพ</strong><small>ใช้โปสเตอร์หรือแบนเนอร์</small></span>{form.contentMode === "IMAGE" ? <Check className="choice-check"/> : null}</button></div></fieldset></div>
          <div className="announcement-content-divider"><span>{form.contentMode === "TEXT" ? <Type size={16}/> : <ImageIcon size={16}/>}รายละเอียดเนื้อหา</span></div>
          {form.contentMode === "IMAGE" ? <div className={`announcement-image-field${imageUrl ? " has-image" : ""}`}><span>รูปภาพประกาศ <em>*</em> {changedBadge("imageMediaId")}</span>{imageUrl ? <Image src={imageUrl} alt={form.imageAlt || "ตัวอย่างรูปประกาศ"} width={1200} height={720} unoptimized/> : <div className="announcement-image-placeholder"><ImagePlus size={30}/><strong>ยังไม่ได้เลือกรูปภาพ</strong><small>เลือกรูปแนวนอนสำหรับแบนเนอร์ หรือแนวตั้งสำหรับโปสเตอร์</small></div>}<button type="button" disabled={pending} onClick={() => setMediaOpen(true)}><ImagePlus size={18}/>{form.imageMediaId ? "เปลี่ยนรูปภาพ" : "เลือกจากคลังสื่อ"}</button><label><span>ข้อความอธิบายรูปภาพ <em>*</em> {changedBadge("imageAlt")}</span><input required maxLength={500} value={form.imageAlt} onChange={(event) => setForm({...form,imageAlt:event.target.value})} placeholder="อธิบายสาระสำคัญในโปสเตอร์สำหรับผู้ใช้โปรแกรมอ่านหน้าจอ"/></label></div> : null}
          {form.contentMode === "TEXT" ? <div className="announcement-rich-text-field"><span>ข้อความประกาศ <em>*</em> {changedBadge("description")}</span><AnnouncementRichTextEditor value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} label="ข้อความประกาศ"/><small>ตัวหนา ตัวเอียง และรายการ · ไม่เกิน 10,000 ตัวอักษร</small></div> : null}
        </div>
      </section>
      <aside className="announcement-edit-card announcement-settings-card">
        <header><span className="announcement-card-icon"><Settings2 size={19}/></span><div><h2>ตั้งค่าการแสดงผล</h2><p>กำหนดลำดับและพฤติกรรม</p></div></header>
        <div className="announcement-editor-body">
          <section className="announcement-settings-section">
            <h3><Settings2 size={16}/>ปุ่มลิงก์ (ไม่บังคับ)</h3>
            <label><span>ประเภทปลายทาง {changedBadge("buttonUrl")}</span><NativeSelect value={selectedTargetKind === "legacy" ? "" : selectedTargetKind} onChange={(event) => changeDestination(event.target.value as DestinationKind)}>
              {selectedTargetKind === "legacy" ? <option value="" disabled>เลือกประเภทปลายทางใหม่</option> : null}
              <option value="none">ไม่มีลิงก์</option>
              <option value="module">ส่วนหลักของเว็บไซต์</option>
              <option value="entity" disabled={entityTargets.length === 0}>หน้าเว็บไซต์หรือหน่วยงาน</option>
              <option value="external">เว็บไซต์ภายนอก</option>
            </NativeSelect></label>
            {selectedTargetKind === "module" ? <label><span>ไปยัง {changedBadge("buttonUrl")}</span><NativeSelect value={form.buttonUrl} onChange={(event) => setForm({ ...form, buttonUrl: event.target.value })}>
              {selectableModuleRoutes.map((route) => <option key={route.value} value={moduleUrl(route.href)}>{route.label}</option>)}
            </NativeSelect></label> : null}
            {selectedTargetKind === "entity" ? <div className="announcement-target-field"><span>หน้าเป้าหมาย {changedBadge("buttonUrl")}</span><AnchoredSelect className="entity-target-select" label="หน้าเป้าหมาย" value={selectedEntity ? `${selectedEntity.entity}:${selectedEntity.id}` : ""}
              options={entityTargets.map((target) => ({ value: `${target.entity}:${target.id}`, label: target.label, description: target.path, group: target.entity === "page" ? "หน้าเว็บไซต์" : "หน่วยงานและกลุ่มงาน" }))}
              onChange={(value) => { const target = entityTargets.find((entry) => `${entry.entity}:${entry.id}` === value); if (target) setForm({ ...form, buttonUrl: target.path }); }}/></div> : null}
            {selectedTargetKind === "external" ? <label><span>URL เว็บไซต์ภายนอก {changedBadge("buttonUrl")}</span>
              <input type="text" inputMode="url" required value={form.buttonUrl} onChange={(event) => setForm({ ...form, buttonUrl: event.target.value })}
                placeholder="https://example.org"/></label> : null}
            {selectedTargetKind === "legacy" ? <div className="announcement-target-field"><span>URL ที่บันทึกไว้ {changedBadge("buttonUrl")}</span><code>{form.buttonUrl}</code></div> : null}
            {selectedTargetKind !== "none" ? <><label><span>ข้อความบนปุ่ม {changedBadge("buttonLabel")}</span><input required maxLength={80} value={form.buttonLabel} onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })}/></label>
              <button type="button" className="announcement-newtab-switch" role="switch" aria-checked={form.openInNewTab}
                onClick={() => setForm({ ...form, openInNewTab: !form.openInNewTab })}><span>เปิดในแท็บใหม่ {changedBadge("openInNewTab")}</span><i aria-hidden="true"/></button></> : null}
          </section>
          <section className="announcement-settings-section">
            <h3><Settings2 size={16}/>การแสดงซ้ำ</h3>
            <label><span>แสดงซ้ำ {changedBadge("modalFrequency")}</span><NativeSelect value={form.modalFrequency} onChange={(event) => setForm({ ...form, modalFrequency: event.target.value as Form["modalFrequency"] })}>
              <option value="ONCE_PER_CAMPAIGN">ครั้งเดียวต่อแคมเปญ</option>
              <option value="SESSION">ครั้งเดียวต่อ Session</option>
              <option value="INTERVAL">ทุก X ชั่วโมง</option>
              <option value="ALWAYS">ทุกครั้งที่เปิดหน้าเว็บไซต์</option>
            </NativeSelect></label>
            {form.modalFrequency === "INTERVAL" ? <label><span>จำนวนชั่วโมง {changedBadge("modalIntervalHours")}</span><input type="number" min={1} max={8760} step={1} value={form.modalIntervalHours ?? 24}
              onChange={(event) => setForm({ ...form, modalIntervalHours: Number(event.target.value) })}/></label> : null}
            <p className="announcement-repeat-help">เริ่มนับเมื่อผู้ชมปิดประกาศ แต่ละประกาศจดจำแยกกัน</p>
          </section>
          <section className="announcement-settings-section"><h3><Settings2 size={16}/>ลำดับการแสดงผล</h3>
            <label><span>ลำดับ (0 = ท้ายสุด) {changedBadge("priority")}</span><input type="number" min={0} max={9999} value={priorityInput} onChange={(event) => { const value = event.target.value; setPriorityInput(value); if (value === "" || /^\d+$/.test(value)) setForm((current) => ({ ...current, priority: value === "" ? 0 : Number(value) })); }} onBlur={() => setPriorityInput(String(form.priority))}/></label>
          </section>
          <div className="announcement-modal-note"><Megaphone size={17}/><span><strong>แสดงทีละรายการ</strong><small>มีเลขลำดับและปุ่มถัดไปเมื่อมีหลายประกาศ โดยไม่โหลดหน้าเว็บใหม่</small></span></div>
        </div>
      </aside>
    </form>
    <MediaPicker open={mediaOpen} currentId={form.imageMediaId} acceptKind="image" onClose={() => setMediaOpen(false)} onSelect={(selected: DemoMediaItem, alt: string) => { setForm({...form,imageMediaId:selected.id,imageAlt:alt || selected.alt}); setImageUrl(selected.previewUrl); setMediaOpen(false); }}/>
    {confirmPublish ? <ConfirmDialog title="เผยแพร่ประกาศ?" description="ระบบจะบันทึกข้อมูลล่าสุดและแสดงเมื่อผู้ชมเข้าหน้าสาธารณะโดยยังไม่เคยเห็นประกาศนี้" confirmLabel="บันทึกและเผยแพร่" variant="default" pending={pending} onClose={() => setConfirmPublish(false)} onConfirm={() => void persist(true)}/>: null}
    {confirmUnpublish ? <ConfirmDialog title="ยกเลิกเผยแพร่ประกาศ?" description={`ประกาศ “${form.title}” จะไม่แสดงบนเว็บไซต์`} confirmLabel="ยกเลิกเผยแพร่" pending={pending} onClose={() => setConfirmUnpublish(false)} onConfirm={() => void unpublish()}/>: null}
    {confirmDiscard ? <ConfirmDialog title="ยกเลิกร่างที่บันทึกไว้?" description="ร่างที่บันทึกไว้และการแก้ไขที่ยังไม่บันทึกจะถูกแทนด้วยฉบับที่เผยแพร่" confirmLabel="ยกเลิกร่าง" pending={pending} onClose={() => setConfirmDiscard(false)} onConfirm={() => void discardDraft()}/>: null}
    {pendingLeaveHref ? <ConfirmDialog title="ออกจากหน้าแก้ไขประกาศโดยไม่บันทึก?" description="การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป หากต้องการเก็บไว้ ให้ยกเลิกแล้วกดบันทึกร่างก่อนออกจากหน้า" confirmLabel="ออกโดยไม่บันทึก" onClose={() => setPendingLeaveHref(null)} onConfirm={() => { const destination = new URL(pendingLeaveHref); restoreSavedForm(); allowLeaveRef.current = true; setPendingLeaveHref(null); if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`); else window.location.assign(destination.href); }}/>: null}
  </div>;
}
