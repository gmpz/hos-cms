"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ChevronDown, EyeOff, Image as ImageIcon, ImagePlus, LayoutTemplate, LoaderCircle, MonitorUp, RotateCcw, Save, Send, Settings2, Type } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { showGlobalToast } from "@/components/ui/global-toast";
import { NativeSelect } from "@/components/ui/native-select";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import { AnnouncementRichTextEditor } from "@/features/announcements/components/announcement-rich-text-editor";
import type { AnnouncementDto, SplashSnapshot } from "@/features/announcements/types";
import { MediaPicker } from "@/features/media/components/media-picker";
import type { DemoMediaItem } from "@/features/media/demo/media-items";

type Form = Pick<AnnouncementDto, "title" | "description" | "contentMode" | "imageMediaId" | "imageAlt" | "buttonLabel" | "splashFrequency" | "splashIntervalHours">;
const emptyForm = (): Form => ({ title: "", description: "", contentMode: "IMAGE", imageMediaId: null, imageAlt: "", buttonLabel: "เข้าสู่เว็บไซต์", splashFrequency: "ONCE_PER_CAMPAIGN", splashIntervalHours: 24 });
const formOf = (value: SplashSnapshot): Form => ({ title: value.title, description: value.description, contentMode: value.contentMode, imageMediaId: value.imageMediaId, imageAlt: value.imageAlt, buttonLabel: value.buttonLabel, splashFrequency: value.splashFrequency, splashIntervalHours: value.splashIntervalHours });
const changeLabels: { key: keyof Form; label: string }[] = [
  { key: "title", label: "หัวข้อ" }, { key: "contentMode", label: "ประเภทเนื้อหา" },
  { key: "imageMediaId", label: "รูปภาพ" }, { key: "imageAlt", label: "คำอธิบายรูปภาพ" }, { key: "description", label: "ข้อความ" },
  { key: "buttonLabel", label: "ข้อความบนปุ่ม" }, { key: "splashFrequency", label: "การแสดงซ้ำ" },
  { key: "splashIntervalHours", label: "จำนวนชั่วโมง" },
];

export function SplashScreenEditor({ item }: { item?: AnnouncementDto }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(() => item ? formOf(item) : emptyForm());
  const [savedDraft, setSavedDraft] = useState<Form>(() => item ? formOf(item) : emptyForm());
  const [publishedSplash, setPublishedSplash] = useState(item?.publishedSplash ?? null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(item?.hasUnpublishedChanges ?? false);
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const requestInFlight = useRef(false);
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | "unpublish" | "discard" | null>(null);
  const pending = pendingAction !== null;
  const [revision, setRevision] = useState(item?.revision ?? 0);
  const [status, setStatus] = useState(item?.status ?? "DRAFT");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const savedChanges = hasUnpublishedChanges && publishedSplash ? changeLabels.filter(({ key }) => savedDraft[key] !== publishedSplash[key]) : [];
  const savedChange = (key: keyof Form) => savedChanges.some((change) => change.key === key);
  const changedBadge = (key: keyof Form) => savedChange(key) ? <span className="splash-draft-field-badge">มีร่างที่บันทึกแล้ว</span> : null;

  function beginRequest(action: NonNullable<typeof pendingAction>) {
    if (requestInFlight.current) return false;
    requestInFlight.current = true;
    setPendingAction(action);
    return true;
  }
  function endRequest() { requestInFlight.current = false; setPendingAction(null); }

  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (requestInFlight.current) return; if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("data-action") === "publish") return setConfirmPublish(true); await persist(false); }
  async function persist(publish: boolean) {
    if (requestInFlight.current) return;
    if (!form.title.trim() || form.title.trim().length > 80 || (form.contentMode === "TEXT" && !announcementPlainText(form.description)) || (form.contentMode === "IMAGE" && !form.imageMediaId) || !Number.isSafeInteger(form.splashIntervalHours) || form.splashIntervalHours < 1) return showGlobalToast({ title: "กรอกข้อมูลไม่ครบ", description: "กรุณาตรวจสอบหัวข้อ เนื้อหา และจำนวนชั่วโมง", variant: "error" });
    if (!beginRequest(publish ? "publish" : "save")) return;
    try {
      const response = await fetch(item ? `/api/splash-screens/${item.id}` : "/api/splash-screens", { method: item ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item ? { data: form, revision, publish } : { data: form, publish }) });
      const saved = await response.json() as AnnouncementDto | { error: string };
      if (!response.ok || !("id" in saved)) throw new Error("error" in saved ? saved.error : "บันทึกไม่สำเร็จ");
      setRevision(saved.revision);
      setStatus(saved.status);
      setSavedDraft(formOf(saved));
      setPublishedSplash(saved.publishedSplash);
      setHasUnpublishedChanges(saved.hasUnpublishedChanges);
      if (publish) setConfirmPublish(false);
      showGlobalToast({ title: publish ? "เผยแพร่แล้ว" : "บันทึกร่างแล้ว", description: publish ? "Splash Screen แสดงก่อนเข้าสู่เว็บไซต์แล้ว" : status === "PUBLISHED" ? "ร่างที่บันทึกไว้ยังไม่แสดงบนเว็บไซต์ กดเผยแพร่เมื่อต้องการใช้" : "บันทึก Splash Screen เรียบร้อย" });
      if (!item) router.replace(`/admin/splash-screens/${saved.id}/edit`); router.refresh();
    } catch (error) { showGlobalToast({ title: publish ? "เผยแพร่ไม่สำเร็จ" : "บันทึกไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" }); }
    finally { endRequest(); }
  }
  async function unpublish() {
    if (!item || !beginRequest("unpublish")) return;
    try { const response = await fetch(`/api/splash-screens/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish", revision }) }); const result = await response.json() as AnnouncementDto | { error: string }; if (!response.ok || !("id" in result)) throw new Error("error" in result ? result.error : "ยกเลิกเผยแพร่ไม่สำเร็จ"); setRevision(result.revision); setStatus(result.status); setHasUnpublishedChanges(false); setConfirmUnpublish(false); showGlobalToast({ title: "ยกเลิกเผยแพร่แล้ว", description: "Splash Screen นี้ไม่แสดงบนเว็บไซต์แล้ว" }); router.refresh(); }
    catch (error) { showGlobalToast({ title: "ยกเลิกเผยแพร่ไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" }); } finally { endRequest(); }
  }

  async function discardDraft() {
    if (!item || !beginRequest("discard")) return;
    try {
      const response = await fetch(`/api/splash-screens/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discard-draft", revision }) });
      const result = await response.json() as AnnouncementDto | { error: string };
      if (!response.ok || !("id" in result)) throw new Error("error" in result ? result.error : "ยกเลิกร่างไม่สำเร็จ");
      const restored = formOf(result);
      setForm(restored); setSavedDraft(restored); setImageUrl(result.imageUrl); setRevision(result.revision);
      setPublishedSplash(result.publishedSplash); setHasUnpublishedChanges(false);
      setConfirmDiscard(false);
      showGlobalToast({ title: "ยกเลิกร่างแล้ว", description: "คืนค่าในหน้าแก้ไขให้ตรงกับฉบับที่เผยแพร่" });
      router.refresh();
    } catch (error) { showGlobalToast({ title: "ยกเลิกร่างไม่สำเร็จ", description: error instanceof Error ? error.message : "กรุณาลองใหม่", variant: "error" }); }
    finally { endRequest(); }
  }

  return <div className="announcement-edit-page"><Link className="announcement-edit-back" href="/admin/splash-screens"><ArrowLeft size={16}/>ย้อนกลับ</Link>
    <header className="announcement-edit-heading"><div className="announcement-edit-title"><div><h1>{item ? "แก้ไข Splash Screen" : "สร้าง Splash Screen ใหม่"}</h1><p>จัดการหน้าต้อนรับก่อนเข้าสู่เว็บไซต์</p></div></div><div className="announcement-edit-actions">{item ? <Link href={`/admin/splash-screens/${item.id}/preview`} target="_blank">ดูตัวอย่าง</Link> : null}<button className="announcement-footer-save" type="submit" form="splash-screen-form" disabled={pending} aria-busy={pendingAction === "save"}>{pendingAction === "save" ? <LoaderCircle className="cms-action-spinner" size={18}/> : <Save size={18}/>}บันทึกร่าง</button><div className="announcement-publish-group"><button className="announcement-footer-publish" type="submit" form="splash-screen-form" data-action="publish" disabled={pending} aria-busy={pendingAction === "publish"}>{pendingAction === "publish" ? <LoaderCircle className="cms-action-spinner" size={18}/> : <Send size={18}/>}เผยแพร่</button>{status === "PUBLISHED" && item ? <details className="announcement-publish-dropdown"><summary aria-label="ตัวเลือกการเผยแพร่"><ChevronDown size={18}/></summary><div className="announcement-publish-menu"><button type="button" disabled={pending} onClick={() => setConfirmUnpublish(true)}><EyeOff size={16}/>ยกเลิกเผยแพร่</button></div></details> : null}</div></div></header>
    {hasUnpublishedChanges ? <section className="splash-draft-notice" aria-live="polite"><div><strong>มีร่างที่บันทึกแล้ว ยังไม่แสดงบนเว็บไซต์</strong><p>แก้ไข: {savedChanges.map((change) => change.label).join(" · ") || "เนื้อหา Splash Screen"} — กดเผยแพร่เพื่ออัปเดตหน้าเว็บจริง</p></div><button type="button" onClick={() => setConfirmDiscard(true)} disabled={pending}><RotateCcw size={16}/>ยกเลิกร่าง</button></section> : null}
    <form id="splash-screen-form" className="announcement-edit-form" onSubmit={(event) => void save(event)}><section className="announcement-edit-card announcement-content-card"><header><span className="announcement-card-icon"><LayoutTemplate size={19}/></span><div><h2>เนื้อหา Splash Screen</h2><p>เลือกรูปแบบและกรอกข้อมูลที่ผู้เข้าชมจะเห็น</p></div></header><div className="announcement-editor-body">
      <label className="announcement-title-field"><span>หัวข้อ <em>*</em> {changedBadge("title")}</span><input required maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}/><small>{form.title.length}/80</small></label>
      <div className="announcement-option-row"><fieldset><legend>ใช้เนื้อหาประเภทใด {changedBadge("contentMode")}</legend><div className="announcement-choice-grid"><button type="button" className={form.contentMode === "TEXT" ? "active" : ""} onClick={() => setForm({ ...form, contentMode: "TEXT" })}><span><Type/></span><span><strong>ข้อความ</strong><small>แสดงข้อความเต็มหน้าจอ</small></span>{form.contentMode === "TEXT" ? <Check className="choice-check"/> : null}</button><button type="button" className={form.contentMode === "IMAGE" ? "active" : ""} onClick={() => setForm({ ...form, contentMode: "IMAGE" })}><span><ImageIcon/></span><span><strong>รูปภาพ</strong><small>ใช้ภาพหน้าต้อนรับ</small></span>{form.contentMode === "IMAGE" ? <Check className="choice-check"/> : null}</button></div></fieldset></div>
      {form.contentMode === "IMAGE" ? <div className={`announcement-image-field${imageUrl ? " has-image" : ""}`}><span>รูปภาพ <em>*</em> {(savedChange("imageMediaId") || savedChange("imageAlt")) ? <span className="splash-draft-field-badge">มีร่างที่บันทึกแล้ว</span> : null}</span>{imageUrl ? <Image src={imageUrl} alt={form.imageAlt || form.title} width={1200} height={720} unoptimized/> : <div className="announcement-image-placeholder"><ImagePlus size={30}/><strong>ยังไม่ได้เลือกรูปภาพ</strong></div>}<button type="button" onClick={() => setMediaOpen(true)}><ImagePlus size={18}/>เลือกจากคลังสื่อ</button></div> : null}
      {form.contentMode === "TEXT" ? <div className="announcement-rich-text-field"><span>ข้อความ <em>*</em> {changedBadge("description")}</span><AnnouncementRichTextEditor value={form.description} onChange={(description) => setForm((current) => ({ ...current, description }))} label="ข้อความ Splash Screen"/></div> : null}
    </div></section><aside className="announcement-edit-card announcement-settings-card"><header><span className="announcement-card-icon"><Settings2 size={19}/></span><div><h2>การแสดงหน้า Welcome</h2><p>กำหนดปุ่มและความถี่</p></div></header><div className="announcement-editor-body"><section className="announcement-settings-section"><label><span>ข้อความบนปุ่ม {changedBadge("buttonLabel")}</span><input maxLength={80} value={form.buttonLabel} onChange={(event) => setForm({ ...form, buttonLabel: event.target.value })}/></label><label><span>แสดงซ้ำ {changedBadge("splashFrequency")}</span><NativeSelect value={form.splashFrequency} onChange={(event) => setForm({ ...form, splashFrequency: event.target.value as Form["splashFrequency"] })}><option value="ONCE_PER_CAMPAIGN">ครั้งเดียวต่อแคมเปญ</option><option value="SESSION">ครั้งเดียวต่อ Session</option><option value="INTERVAL">ทุก X ชั่วโมง</option><option value="ALWAYS">ทุกครั้งที่เข้าหน้าแรก</option></NativeSelect></label>{form.splashFrequency === "INTERVAL" ? <label><span>จำนวนชั่วโมง {changedBadge("splashIntervalHours")}</span><input type="number" min={1} max={8760} step={1} value={form.splashIntervalHours} onChange={(event) => setForm({ ...form, splashIntervalHours: Number(event.target.value) })}/></label> : null}</section><div className="announcement-modal-note"><MonitorUp size={17}/><span><strong>เปิดใช้งานได้หนึ่งรายการ</strong><small>เมื่อเปิดรายการนี้ ระบบจะปิดรายการเดิมอัตโนมัติ</small></span></div></div></aside></form>
    <MediaPicker open={mediaOpen} currentId={form.imageMediaId} acceptKind="image" onClose={() => setMediaOpen(false)} onSelect={(selected: DemoMediaItem) => { setForm({ ...form, imageMediaId: selected.id, imageAlt: selected.name }); setImageUrl(selected.previewUrl); setMediaOpen(false); }}/>
    {confirmPublish ? <ConfirmDialog title="เผยแพร่ Splash Screen?" description="ระบบจะยกเลิกการเผยแพร่ Splash Screen รายการเดิมโดยอัตโนมัติ" confirmLabel="บันทึกและเผยแพร่" pendingLabel="กำลังเผยแพร่..." variant="default" pending={pending} onClose={() => { if (!requestInFlight.current) setConfirmPublish(false); }} onConfirm={() => { void persist(true); }}/> : null}
    {confirmUnpublish ? <ConfirmDialog title="ยกเลิกเผยแพร่ Splash Screen?" description={`“${form.title}” จะไม่แสดงก่อนเข้าสู่เว็บไซต์`} confirmLabel="ยกเลิกเผยแพร่" pendingLabel="กำลังยกเลิกเผยแพร่..." pending={pending} onClose={() => { if (!requestInFlight.current) setConfirmUnpublish(false); }} onConfirm={() => { void unpublish(); }}/> : null}
    {confirmDiscard ? <ConfirmDialog title="ยกเลิกร่างที่บันทึกไว้?" description="การแก้ไขในร่างจะถูกคืนค่าให้ตรงกับฉบับที่เผยแพร่ และไม่กระทบหน้าเว็บจริง" confirmLabel="ยกเลิกร่าง" pendingLabel="กำลังยกเลิกร่าง..." pending={pending} onClose={() => { if (!requestInFlight.current) setConfirmDiscard(false); }} onConfirm={() => { void discardDraft(); }}/> : null}
  </div>;
}
