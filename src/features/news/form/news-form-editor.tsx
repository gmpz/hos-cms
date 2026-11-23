"use client";
import "./news-form.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaPicker } from "@/features/media/components/media-picker";
import { getDemoMediaItem, seedDemoMediaItems } from "@/features/media/demo/media-registry";
import type { UploadedMediaItem } from "@/features/media/upload-media-file";
import { CategorySelect } from "@/features/categories/components/category-select";
import { categoryName, readCategories } from "@/features/categories/demo/storage";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, CalendarDays, ChevronDown, Eye, FilePenLine, FilePlus2, Monitor, RefreshCw, RotateCcw, Save, Send, Settings2, Smartphone, Tablet, Trash2, X } from "lucide-react";
import { PublishDropdown } from "@/components/admin/publish-dropdown";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { refreshUnits } from "@/features/units/demo/storage";
import type { DemoUnit } from "@/features/units/demo/model";
import type { DemoPost } from "@/features/pages/demo/data";
import { actOnPost, savePost } from "../demo/storage";
import { BlockRenderer } from "@/features/pages/blocks/renderers/block-renderer";
import { AdminContentLoading } from "@/components/admin/admin-content-loading";
import { formBlocks } from "./template";
import { NewsCoverEditor } from "../components/news-cover-editor";
import { emptyNewsForm, type NewsFormPayload } from "./template";
import { NewsFormRichText } from "./news-form-rich-text";

type Picker = "cover" | "pdf" | "file" | null;
function DraftBadge({ status }: { status: string | null }) {
  return status ? <span className="news-form-draft-label"><FilePenLine size={13}/>{status}</span> : null;
}

export function NewsFormEditor({ postId }: { postId: string | null }) {
  const router = useRouter();
  const [post, setPost] = useState<DemoPost | null>(null);
  const [form, setForm] = useState<NewsFormPayload>(emptyNewsForm);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [coverFit, setCoverFit] = useState<"cover" | "contain">("cover");
  const [coverFocus, setCoverFocus] = useState({ x: 50, y: 50 });
  const [coverZoom, setCoverZoom] = useState(100);
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [picker, setPicker] = useState<Picker>(null);
  const [replaceFileIndex, setReplaceFileIndex] = useState<number | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(postId));
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile" | null>(null);
  useEffect(() => {
    if (!previewMode) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewMode(null); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [previewMode]);
  useEffect(() => { void refreshUnits(true).then(setUnits).catch(() => undefined); }, []);
  useEffect(() => {
    if (!postId) return;
    let active = true;
    void fetch(`/api/posts/${postId}`, { cache: "no-store" }).then(async (response) => {
      const value = await response.json() as { post?: DemoPost; media?: UploadedMediaItem[]; error?: string };
      if (!response.ok || !value.post) throw new Error(value.error ?? "โหลดข่าวไม่สำเร็จ");
      return value;
    }).then(({ post: value, media }) => {
      if (!active || !value) return;
      seedDemoMediaItems(media ?? []);
      setPost(value); setTitle(value.title); setCategoryId(value.categoryId); setUnitId(value.unitId);
      setCoverMediaId(value.coverMediaId); setCoverFit(value.coverFit); setCoverFocus(value.coverFocus); setCoverZoom(value.coverZoom);
      setForm(value.formPayload as NewsFormPayload);
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "โหลดข่าวไม่สำเร็จ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);
  async function persist(publish: boolean) {
    if (busy) return;
    if (!categoryId) { setMetaOpen(true); setError("กรุณาเลือกหมวดหมู่ข่าว"); return; }
    setError(""); setBusy(true);
    try {
      const saved = await savePost({
        ...(post ?? { id: "new-post", slug: "", status: "draft", publishedAt: null, updatedAt: "", owner: "โรงพยาบาล", excerpt: "", blocks: [], showCoverInContent: false }),
        editorMode: "form", formPayload: form, title, categoryId, unitId, coverMediaId, coverFit, coverFocus, coverZoom,
      } as DemoPost, publish);
      setPost(saved);
      if (!postId) router.replace(`/admin/posts/${saved.id}/edit`);
      setError(publish ? "เผยแพร่ข่าวแล้ว" : "บันทึกร่างแล้ว");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  async function postAction(action: "unpublish" | "discardDraft") {
    if (!post || busy) return;
    setBusy(true); setError("");
    try {
      const updated = await actOnPost(post, action);
      if (updated) {
        setPost(updated); setTitle(updated.title); setCategoryId(updated.categoryId); setUnitId(updated.unitId);
        setCoverMediaId(updated.coverMediaId); setCoverFit(updated.coverFit); setCoverFocus(updated.coverFocus); setCoverZoom(updated.coverZoom);
        setForm(updated.formPayload as NewsFormPayload);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  if (loading) return <AdminContentLoading label="กำลังโหลดข่าว..." />;
  if (postId && !post) return <main className="news-form-editor"><p role="alert">{error}</p></main>;
  const cover = getDemoMediaItem(coverMediaId);
  const category = categoryName(readCategories("posts"), categoryId);
  const ownerName = units.find((unit) => unit.id === unitId)?.name ?? "โรงพยาบาล";
  const hasChanges = !post || JSON.stringify({ title, categoryId, unitId, coverMediaId, coverFit, coverFocus, coverZoom, form }) !== JSON.stringify({ title: post.title, categoryId: post.categoryId, unitId: post.unitId, coverMediaId: post.coverMediaId, coverFit: post.coverFit, coverFocus: post.coverFocus, coverZoom: post.coverZoom, form: post.formPayload });
  const hasSavedDraft = Boolean(post && (post.status === "draft" || post.hasUnpublishedChanges));
  const savedForm = post?.formPayload as NewsFormPayload | undefined;
  const currentBlocks = formBlocks(form);
  function fieldStatus(current: unknown, saved: unknown, published: unknown): string | null {
    if (JSON.stringify(current) !== JSON.stringify(saved)) return "ยังไม่บันทึก";
    if (post?.status === "draft") return "บันทึกร่างแล้ว";
    if (published !== undefined && JSON.stringify(current) !== JSON.stringify(published)) return "ร่างที่ยังไม่เผยแพร่";
    return null;
  }
  function blockStatus(id: string, currentFields: unknown, savedFields: unknown): string | null {
    if (JSON.stringify(currentFields) !== JSON.stringify(savedFields)) return "ยังไม่บันทึก";
    const currentBlock = currentBlocks.find((block) => block.id === id);
    const publishedBlock = post?.publishedBlocks?.find((block) => block.id === id);
    if (!currentBlock) return publishedBlock ? "ร่างที่ยังไม่เผยแพร่" : null;
    if (post?.status === "draft") return "บันทึกร่างแล้ว";
    return JSON.stringify(currentBlock.config) !== JSON.stringify(publishedBlock?.config) ? "ร่างที่ยังไม่เผยแพร่" : null;
  }
  const titleStatus = fieldStatus(title, post?.title ?? "", post?.publishedDetails?.title);
  const metaStatus = fieldStatus({ categoryId, unitId, coverMediaId, coverFit, coverFocus, coverZoom }, post ? { categoryId: post.categoryId, unitId: post.unitId, coverMediaId: post.coverMediaId, coverFit: post.coverFit, coverFocus: post.coverFocus, coverZoom: post.coverZoom } : { categoryId: "", unitId: null, coverMediaId: null, coverFit: "cover", coverFocus: { x: 50, y: 50 }, coverZoom: 100 }, post?.publishedDetails ? { categoryId: post.publishedDetails.categoryId, unitId: post.publishedDetails.unitId, coverMediaId: post.publishedDetails.coverMediaId, coverFit: post.publishedDetails.coverFit, coverFocus: post.publishedDetails.coverFocus, coverZoom: post.publishedDetails.coverZoom } : undefined);
  const contentStatus = blockStatus("form-content", form.content, savedForm?.content ?? emptyNewsForm().content);
  const videoStatus = blockStatus("form-video", [form.videoUrl, form.videoTitle ?? "", form.videoDescription ?? "", form.videoCaption ?? ""], [savedForm?.videoUrl ?? "", savedForm?.videoTitle ?? "", savedForm?.videoDescription ?? "", savedForm?.videoCaption ?? ""]);
  const pdfStatus = blockStatus("form-pdf", [form.pdfMediaId, form.pdfTitle ?? ""], [savedForm?.pdfMediaId ?? null, savedForm?.pdfTitle ?? ""]);
  const filesStatus = blockStatus("form-files", [form.files, form.filesTitle ?? ""], [savedForm?.files ?? [], savedForm?.filesTitle ?? ""]);
  return <main className="news-form-editor news-editor has-toolbar">
    <header className="news-form-heading"><div><Link href="/admin/posts"><ArrowLeft size={16}/>ย้อนกลับ</Link><h1>{postId ? "แก้ไขข่าวแบบฟอร์ม" : "สร้างข่าว"}</h1><p>กรอกข้อมูลที่จำเป็น แล้วบันทึกหรือเผยแพร่ได้ทันที</p></div></header>
    {(hasChanges || hasSavedDraft) ? <section className="splash-draft-notice" aria-live="polite"><div><strong>{hasChanges ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : post?.hasUnpublishedChanges ? "มีร่างที่บันทึกแล้ว ยังไม่ได้เผยแพร่" : "บันทึกร่างแล้ว ยังไม่ได้เผยแพร่"}</strong>{hasSavedDraft && post?.updatedAt ? <p>บันทึกล่าสุด {post.updatedAt} · {post.status === "published" ? "หน้าเว็บไซต์ยังแสดงฉบับเดิม" : "ข่าวนี้ยังไม่แสดงบนเว็บไซต์"}</p> : null}</div>{post?.status === "published" && post.hasUnpublishedChanges ? <button type="button" disabled={busy} onClick={() => setConfirmDiscardDraft(true)}><RotateCcw size={16}/>ยกเลิกร่างที่บันทึก</button> : null}</section> : null}
    <section className="news-meta-card">
      <label className="news-title-input"><span>ชื่อข่าว <DraftBadge status={titleStatus}/></span><input value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} placeholder="ระบุชื่อข่าวหรือผลงาน" /></label>
      <button type="button" className="news-meta-trigger" onClick={() => setMetaOpen(true)}><Settings2 size={17} aria-hidden="true"/><strong>ข้อมูลข่าว</strong><DraftBadge status={metaStatus}/><span>{category || "ยังไม่เลือกหมวดหมู่"} · {ownerName} · {cover ? "มีรูปปกการ์ด" : "ยังไม่มีรูปปก"}</span></button>
    </section>
    <div className="news-form-panel">
      <label>เนื้อหาข่าว <em>*</em> <DraftBadge status={contentStatus}/></label><NewsFormRichText value={form.content} onChange={(content) => setForm((current) => ({ ...current, content }))}/>
      <details className="news-form-options"><summary><Settings2 size={20} aria-hidden="true"/><span className="news-form-options-label"><strong>ตัวเลือกเพิ่มเติม</strong><small>วิดีโอ · PDF · ไฟล์แนบ</small></span><ChevronDown className="news-form-options-chevron" size={20} aria-hidden="true"/></summary>
        <section className="news-form-video-fields"><h2>วิดีโอ <DraftBadge status={videoStatus}/></h2>
          <label>ลิงก์วิดีโอ<input value={form.videoUrl} onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))} placeholder="https://www.youtube.com/watch?v=…"/></label>
          <label>หัวข้อวิดีโอ<input value={form.videoTitle ?? ""} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, videoTitle: event.target.value }))} placeholder="หัวข้อที่แสดงเหนือวิดีโอ"/></label>
          <label>คำอธิบาย<textarea rows={3} value={form.videoDescription ?? ""} maxLength={2000} onChange={(event) => setForm((current) => ({ ...current, videoDescription: event.target.value }))} placeholder="ข้อความอธิบายก่อนวิดีโอ"/></label>
          <label>ข้อความใต้วิดีโอ<input value={form.videoCaption ?? ""} maxLength={300} onChange={(event) => setForm((current) => ({ ...current, videoCaption: event.target.value }))} placeholder="คำบรรยายใต้ตัววิดีโอ"/></label>
        </section>
        <section><h2>PDF Viewer <DraftBadge status={pdfStatus}/></h2>
          <label>หัวข้อ PDF<input value={form.pdfTitle ?? ""} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, pdfTitle: event.target.value }))} placeholder="หัวข้อที่แสดงเหนือ PDF"/></label>
          {form.pdfMediaId ? <div className="news-form-file-card">
            <DocumentFileIcon file={getDemoMediaItem(form.pdfMediaId)}/>
            <div className="news-form-file-info"><strong title={getDemoMediaItem(form.pdfMediaId)?.name ?? "ไฟล์ PDF"}>{getDemoMediaItem(form.pdfMediaId)?.name ?? "ไฟล์ PDF"}</strong><small>{getDemoMediaItem(form.pdfMediaId)?.size ?? "เอกสาร PDF"}</small></div>
            <div className="news-form-file-actions"><button type="button" onClick={() => setPicker("pdf")}><RefreshCw size={15}/>เปลี่ยนไฟล์</button><button type="button" className="danger" onClick={() => setForm((current) => ({ ...current, pdfMediaId: null }))}><Trash2 size={15}/>นำออก</button></div>
          </div> : <button type="button" className="news-form-add-file" onClick={() => setPicker("pdf")}><FilePlus2 size={18}/>เลือกไฟล์ PDF</button>}
        </section>
        <section><h2>ไฟล์แนบ <DraftBadge status={filesStatus}/></h2>
          <label>หัวข้อไฟล์แนบ<input value={form.filesTitle ?? ""} maxLength={160} onChange={(event) => setForm((current) => ({ ...current, filesTitle: event.target.value }))} placeholder="หัวข้อที่แสดงเหนือรายการไฟล์"/></label>
          <div className="news-form-file-list">{form.files.map((item, index) => <div className="news-form-file-card" key={`${item.mediaId}-${index}`}>
            <DocumentFileIcon file={getDemoMediaItem(item.mediaId)}/>
            <div className="news-form-file-info"><strong title={getDemoMediaItem(item.mediaId)?.name ?? "ไฟล์เอกสาร"}>{getDemoMediaItem(item.mediaId)?.name ?? "ไฟล์เอกสาร"}</strong><small>{getDemoMediaItem(item.mediaId)?.size ?? "ไฟล์แนบ"}</small></div>
            <div className="news-form-file-actions"><button type="button" onClick={() => { setReplaceFileIndex(index); setPicker("file"); }}><RefreshCw size={15}/>เปลี่ยนไฟล์</button><button type="button" className="danger" onClick={() => setForm((current) => ({ ...current, files: current.files.filter((_, i) => i !== index) }))}><Trash2 size={15}/>นำออก</button></div>
            <label className="news-form-file-label">ชื่อที่แสดงบนเว็บไซต์<input value={item.label} maxLength={300} onChange={(event) => setForm((current) => ({ ...current, files: current.files.map((file, i) => i === index ? { ...file, label: event.target.value } : file) }))} placeholder="ชื่อไฟล์สำหรับผู้เข้าชม"/></label>
          </div>)}</div>
          <button type="button" className="news-form-add-file" onClick={() => { setReplaceFileIndex(null); setPicker("file"); }}><FilePlus2 size={18}/>เพิ่มไฟล์แนบ</button>
        </section>
      </details>
    </div>
    {error ? <p role="status" className="news-form-message">{error}</p> : null}
    <div className="news-editor-toolbar" role="toolbar" aria-label="เครื่องมือจัดการข่าว"><div className="news-editor-toolbar-tools"><button type="button" aria-label="ดูตัวอย่าง" onClick={() => setPreviewMode("desktop")}><Eye size={17}/><span className="news-toolbar-label">ดูตัวอย่าง</span></button></div><div className="news-editor-toolbar-actions"><button type="button" aria-label="บันทึก" disabled={busy || !hasChanges} onClick={() => setConfirmSave(true)}><Save size={16}/><span className="news-toolbar-label">บันทึก</span></button><div className="admin-publish-split"><button type="button" className="primary-button" aria-label="เผยแพร่" disabled={busy || (post?.status === "published" && !hasChanges && !post.hasUnpublishedChanges)} onClick={() => setConfirmPublish(true)}><Send size={15}/><span>เผยแพร่</span></button>{post?.status === "published" ? <PublishDropdown disabled={busy} onUnpublish={() => setConfirmUnpublish(true)}/> : null}</div></div></div>
    {metaOpen ? <div className="builder-modal-layer news-meta-modal-layer">
      <button type="button" className="builder-modal-backdrop" onClick={() => setMetaOpen(false)} aria-label="ปิดข้อมูลข่าว" />
      <section className="news-meta-modal" role="dialog" aria-modal="true" aria-labelledby="news-form-meta-title">
        <header><div><strong id="news-form-meta-title">ข้อมูลข่าว</strong><small>ตั้งค่าหมวดหมู่ เจ้าของเนื้อหา และรูปปกการ์ดข่าว</small></div><button type="button" onClick={() => setMetaOpen(false)} aria-label="ปิด"><X size={20}/></button></header>
        <div className="news-meta-modal-body">
          <div className="news-meta-grid">
            <CategorySelect scope="posts" required showManageLink={false} value={categoryId} onChange={(id) => setCategoryId(id ?? "")}/>
            <label><span>เจ้าของเนื้อหา</span><NativeSelect value={unitId ?? "hospital"} onChange={(event) => setUnitId(event.target.value === "hospital" ? null : event.target.value)}><option value="hospital">โรงพยาบาล</option>{units.filter((unit) => unit.id !== "hospital").map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</NativeSelect></label>
          </div>
          <div className="news-cover"><p className="news-cover-heading">รูปปกการ์ดข่าว</p><NewsCoverEditor post={{ coverFit, coverFocus, coverZoom }} cover={cover} onChange={(value) => { if (value.coverFit) setCoverFit(value.coverFit); if (value.coverFocus) setCoverFocus(value.coverFocus); if (value.coverZoom) setCoverZoom(value.coverZoom); }}/><div className="news-cover-actions"><button type="button" onClick={() => setPicker("cover")}>{cover ? "เปลี่ยนรูป" : "เลือกจากคลังสื่อ"}</button>{cover ? <button type="button" className="danger" onClick={() => setConfirmRemoveCover(true)}><Trash2 size={13}/> ลบรูป</button> : null}</div></div>
        </div>
        <footer><button type="button" className="primary-button" onClick={() => setMetaOpen(false)}>เสร็จสิ้น</button></footer>
      </section>
    </div> : null}
    {previewMode ? <div className="news-preview-layer"><button type="button" className="news-preview-backdrop" onClick={() => setPreviewMode(null)} aria-label="ปิดตัวอย่าง"/><section className="news-preview-dialog" role="dialog" aria-modal="true" aria-label="ตัวอย่างหน้าข่าว"><header className="news-preview-toolbar"><div><strong>ตัวอย่างหน้าข่าว</strong><small>แสดงข้อมูลล่าสุดที่กำลังแก้ไข ยังไม่ต้องบันทึก</small></div><div className="news-preview-controls" role="group" aria-label="ขนาดตัวอย่าง"><button type="button" aria-pressed={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")}><Monitor size={16}/> เดสก์ท็อป</button><button type="button" aria-pressed={previewMode === "tablet"} onClick={() => setPreviewMode("tablet")}><Tablet size={16}/> แท็บเล็ต</button><button type="button" aria-pressed={previewMode === "mobile"} onClick={() => setPreviewMode("mobile")}><Smartphone size={16}/> มือถือ</button></div><button type="button" className="news-preview-close" onClick={() => setPreviewMode(null)} aria-label="ปิดตัวอย่าง"><X size={20}/></button></header><div className="news-preview-scroll"><div className={`news-preview-frame ${previewMode}`}><div className="public-news-page"><article className="public-news-article form-news-article"><header><span>{category}</span><h1>{title || "ชื่อข่าว"}</h1><div className="public-news-meta"><span><CalendarDays size={16}/> วันที่เผยแพร่ {post?.publishedAt ?? "ยังไม่เผยแพร่"}</span><span>โดย {ownerName}</span></div></header><div className="public-news-body"><BlockRenderer blocks={formBlocks(form)} pdfPositionOnly/></div></article></div></div></div></section></div> : null}
    {confirmRemoveCover ? <ConfirmDialog title="ลบรูปปกการ์ดข่าว?" description="รูปปกจะถูกนำออกจากข่าวนี้ แต่ไฟล์ยังอยู่ในคลังสื่อ" confirmLabel="ลบรูปปก" layerClassName="news-cover-confirm-layer" onClose={() => setConfirmRemoveCover(false)} onConfirm={() => { setCoverMediaId(null); setConfirmRemoveCover(false); }}/> : null}
    {confirmSave ? <ConfirmDialog title="บันทึกการแก้ไขข่าว?" description={post?.status === "published" ? "การแก้ไขจะถูกบันทึกเป็นร่าง หน้าเว็บไซต์ยังแสดงฉบับที่เผยแพร่อยู่" : "ข่าวจะถูกบันทึกเป็นฉบับร่าง และยังไม่แสดงบนเว็บไซต์"} confirmLabel="บันทึก" pending={busy} onClose={() => setConfirmSave(false)} onConfirm={() => { setConfirmSave(false); void persist(false); }}/> : null}
    {confirmPublish ? <ConfirmDialog title="ยืนยันการเผยแพร่ข่าว" description={`“${title || "ข่าวใหม่"}” จะแสดงต่อผู้เข้าชมเว็บไซต์ทันที`} confirmLabel="เผยแพร่" pending={busy} onClose={() => setConfirmPublish(false)} onConfirm={() => { setConfirmPublish(false); void persist(true); }}/> : null}
    {confirmUnpublish ? <ConfirmDialog title="ยกเลิกเผยแพร่ข่าว?" description={`“${title}” จะไม่แสดงบนเว็บไซต์ การแก้ไขที่ยังไม่ได้บันทึกจะหายไป`} confirmLabel="ยกเลิกเผยแพร่" pending={busy} onClose={() => setConfirmUnpublish(false)} onConfirm={() => { setConfirmUnpublish(false); void postAction("unpublish"); }}/> : null}
    {confirmDiscardDraft ? <ConfirmDialog title="ยกเลิกร่างที่บันทึกไว้?" description="การแก้ไขที่ยังไม่ได้เผยแพร่ทั้งหมดจะถูกลบและคืนค่าเป็นฉบับที่เผยแพร่อยู่" confirmLabel="ยกเลิกร่าง" pending={busy} onClose={() => setConfirmDiscardDraft(false)} onConfirm={() => { setConfirmDiscardDraft(false); void postAction("discardDraft"); }}/> : null}
    <MediaPicker open={picker !== null} currentId={picker === "cover" ? coverMediaId : picker === "pdf" ? form.pdfMediaId : picker === "file" && replaceFileIndex !== null ? form.files[replaceFileIndex]?.mediaId ?? null : null} acceptKind={picker === "cover" ? "image" : picker === "pdf" ? "pdf" : "document"} onClose={() => { setPicker(null); setReplaceFileIndex(null); }} onSelect={(item) => { if (picker === "cover") setCoverMediaId(item.id); if (picker === "pdf") setForm((current) => ({ ...current, pdfMediaId: item.id })); if (picker === "file") setForm((current) => ({ ...current, files: replaceFileIndex === null ? [...current.files, { mediaId: item.id, label: item.name }] : current.files.map((file, index) => index === replaceFileIndex ? { mediaId: item.id, label: file.label || item.name } : file) })); setPicker(null); setReplaceFileIndex(null); }}/>
  </main>;
}
