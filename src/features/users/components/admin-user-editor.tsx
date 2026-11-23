"use client";

import { ArrowLeft, Building2, Camera, Check, LoaderCircle, Search, ShieldCheck, Trash2, Upload, UserRound, X } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import Link from "next/link";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionToast } from "@/components/admin/action-toast";
import { personnelPhotoPositionStyle } from "@/features/units/components/personnel-photo-position";
import { PersonnelPhotoFocusEditor } from "@/features/units/components/personnel-photo-focus-editor";
import { updateUserAction, type UserActionResult } from "../actions";
import { PhoneFields } from "./phone-fields";

type Option = { id: string; name: string };
type Options = { personTypes: Option[]; positions: Option[]; levels: Option[]; units: Option[]; media: Option[] };
type UserData = {
  id: string; username: string; displayName: string; role: "ADMIN" | "MEMBER"; status: "ACTIVE" | "DISABLED"; phone: string; phoneExtension: string; email: string; publishPhone: boolean; publishEmail: boolean;
  personTypeId: string | null; positionId: string | null; levelId: string | null; profileMediaId: string | null; profilePhotoFocusX: number; profilePhotoFocusY: number; profilePhotoZoom: number;
  photoUrl: string | null; personType: { name: string } | null; position: { name: string } | null; level: { name: string } | null;
  memberships: { unitId: string; isPrimary: boolean; unit: { name: string } }[]; unitIds: string[]; primaryUnitId: string | null;
};

export function AdminUserEditor({ user, options, currentUserId }: { user: UserData; options: Options; currentUserId: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<UserActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl);
  const [photoAction, setPhotoAction] = useState<"keep" | "replace" | "remove">("keep");
  const [photoFocus, setPhotoFocus] = useState({ x: user.profilePhotoFocusX, y: user.profilePhotoFocusY });
  const [photoZoom, setPhotoZoom] = useState(user.profilePhotoZoom);
  useLayoutEffect(() => () => {
    formRef.current?.reset();
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    setPhotoUrl(user.photoUrl);
    setPhotoAction("keep");
    setPhotoFocus({ x: user.profilePhotoFocusX, y: user.profilePhotoFocusY });
    setPhotoZoom(user.profilePhotoZoom);
    setToast(null);
  }, [user]);
  function choosePhoto(file: File) { if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { if (photoInput.current) photoInput.current.value = ""; setToast({ ok: false, message: "รองรับรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" }); return; } if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current); previewObjectUrl.current = URL.createObjectURL(file); setPhotoUrl(previewObjectUrl.current); setPhotoAction("replace"); setPhotoFocus({ x: 50, y: 25 }); setPhotoZoom(100); }
  function removePhoto() { if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current); previewObjectUrl.current = null; if (photoInput.current) photoInput.current.value = ""; setPhotoUrl(null); setPhotoAction(user.photoUrl ? "remove" : "keep"); setPhotoFocus({ x: 50, y: 25 }); setPhotoZoom(100); }
  function save(formData: FormData) { setToast(null); startTransition(async () => { const result = await updateUserAction(formData); setToast(result); if (result.ok) router.refresh(); }); }
  return <main className="profile-page admin-user-edit-page">
    {toast ? <ActionToast ok={toast.ok} title={toast.ok ? "บันทึกข้อมูลแล้ว" : "บันทึกไม่สำเร็จ"} description={toast.message} onClose={() => setToast(null)}/> : null}
    <Link className="admin-user-back" href="/admin/users"><ArrowLeft size={16}/>ย้อนกลับ</Link>
    <header><h1>แก้ไขโปรไฟล์ผู้ใช้</h1><p>แก้ไขข้อมูลบุคลากร ข้อมูลติดต่อ สิทธิ์ และหน่วยงานที่สังกัด</p></header>
    <div className="profile-grid">
      <aside className="profile-summary-card"><div className="profile-summary-identity"><span className="profile-summary-photo" style={user.photoUrl ? { backgroundImage: `url(${user.photoUrl})`, ...personnelPhotoPositionStyle({ x: user.profilePhotoFocusX, y: user.profilePhotoFocusY }, user.profilePhotoZoom) } : undefined}>{user.photoUrl ? null : <UserRound size={48}/>}</span><div><h2>{user.displayName}</h2><p>@{user.username}</p></div></div><dl className="profile-summary-details"><div><dt>ประเภทบุคลากร</dt><dd>{user.personType?.name ?? "ไม่ระบุ"}</dd></div><div><dt>ตำแหน่ง</dt><dd>{user.position?.name ?? "ไม่ระบุ"}</dd></div><div><dt>ระดับ</dt><dd>{user.level?.name ?? "ไม่ระบุ"}</dd></div><div><dt>สถานะบัญชี</dt><dd><span className={`users-status ${user.status === "ACTIVE" ? "active" : "disabled"}`}>{user.status === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}</span></dd></div></dl><section className="profile-unit-summary"><h3><Building2 size={17}/>หน่วยงานที่สังกัด</h3>{user.memberships.length ? <ul>{user.memberships.map((item) => <li key={item.unitId}>{item.unit.name}{item.isPrimary ? <em>หน่วยงานหลัก</em> : null}</li>)}</ul> : <p>ยังไม่ได้กำหนดหน่วยงาน</p>}</section></aside>
      <form ref={formRef} action={save} className="profile-editor-form"><input type="hidden" name="id" value={user.id}/><input type="hidden" name="profileMediaId" value={user.profileMediaId ?? ""}/><input type="hidden" name="profilePhotoAction" value={photoAction}/><input type="hidden" name="profilePhotoFocusX" value={photoFocus.x}/><input type="hidden" name="profilePhotoFocusY" value={photoFocus.y}/><input type="hidden" name="profilePhotoZoom" value={photoZoom}/>
        <section className="profile-form-section"><header><h2>ข้อมูลบุคลากร</h2><p>แก้ไขชื่อ ประเภท ตำแหน่ง และระดับของผู้ใช้</p></header><div className="profile-details-grid"><label><span>ชื่อ-นามสกุล</span><input name="displayName" defaultValue={user.displayName} minLength={2} maxLength={160} required/></label><Select name="personTypeId" label="ประเภทบุคลากร" value={user.personTypeId} options={options.personTypes}/><Select name="positionId" label="ตำแหน่ง" value={user.positionId} options={options.positions}/><Select name="levelId" label="ระดับ" value={user.levelId} options={options.levels}/></div></section>
        <section className="profile-form-section"><header><h2>รูปโปรไฟล์</h2><p>เพิ่ม เปลี่ยน ลบ และจัดตำแหน่งรูปแทนผู้ใช้ได้</p></header><input ref={photoInput} name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) choosePhoto(file); }}/>{photoUrl ? <div className="profile-photo-focus"><PersonnelPhotoFocusEditor imageStyle={{ backgroundImage: `url(${photoUrl})` }} value={photoFocus} onChange={setPhotoFocus} zoom={photoZoom} onZoomChange={setPhotoZoom} actions={<div className="profile-photo-actions"><button type="button" onClick={() => photoInput.current?.click()}><Upload size={15}/>เปลี่ยนรูป</button><button type="button" className="danger" onClick={removePhoto}><Trash2 size={15}/>ลบรูป</button></div>}/></div> : <div className="profile-photo-field"><span className="profile-photo-preview"><UserRound size={34}/><i><Camera size={14}/></i></span><div className="profile-photo-upload-copy"><div><strong>เลือกรูปโปรไฟล์</strong><p>{photoAction === "remove" ? "รูปจะถูกลบเมื่อกดบันทึกข้อมูล" : "ไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB"}</p></div><div className="profile-photo-actions"><button type="button" onClick={() => photoInput.current?.click()}><Upload size={15}/>เพิ่มรูป</button></div></div></div>}</section>
        <section className="profile-form-section"><header><h2>หน่วยงานที่สังกัด</h2><p>ค้นหาและเลือกได้หลายหน่วยงาน จากนั้นกำหนดหน่วยงานหลักจากรายการที่เลือก</p></header><UnitMembershipPicker options={options.units} initialIds={user.unitIds} initialPrimaryId={user.primaryUnitId}/></section>
        <section className="profile-form-section">
          <header><h2>ข้อมูลติดต่อและสิทธิ์</h2><p>กำหนดข้อมูลเผยแพร่และบทบาทของบัญชี</p></header>
          <div className="profile-contact-grid">
            <div><PhoneFields phone={user.phone} extension={user.phoneExtension}/><label className="profile-publish"><input type="checkbox" name="publishPhone" defaultChecked={user.publishPhone}/> แสดงโทรศัพท์ในหน้าเว็บไซต์</label></div>
            <div><label><span>อีเมล</span><input name="email" type="email" defaultValue={user.email} maxLength={254}/></label><label className="profile-publish"><input type="checkbox" name="publishEmail" defaultChecked={user.publishEmail}/> แสดงอีเมลในหน้าเว็บไซต์</label></div>
          </div>
          <label className="admin-profile-role"><span>บทบาท</span>{user.id === currentUserId ? <><input type="hidden" name="role" value={user.role}/><NativeSelect value={user.role} disabled><option value="ADMIN">ผู้ดูแลระบบ</option></NativeSelect><small><ShieldCheck size={13}/>ไม่สามารถลดสิทธิ์บัญชีที่กำลังใช้งาน</small></> : <NativeSelect name="role" defaultValue={user.role}><option value="MEMBER">บุคลากร</option><option value="ADMIN">ผู้ดูแลระบบ</option></NativeSelect>}</label>
        </section>
        <footer className="profile-form-footer"><button type="button" onClick={() => router.push("/admin/users")}>ยกเลิก</button><button className="primary-button" disabled={pending}>{pending ? <><LoaderCircle className="profile-submit-spinner" size={16}/>กำลังบันทึก...</> : "บันทึกข้อมูล"}</button></footer>
      </form>
    </div>
  </main>;
}

function Select({ name, label, value, options }: { name: string; label: string; value: string | null; options: Option[] }) { return <label><span>{label}</span><NativeSelect name={name} defaultValue={value ?? ""}><option value="">ไม่ระบุ</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></label>; }

function UnitMembershipPicker({ options, initialIds, initialPrimaryId }: { options: Option[]; initialIds: string[]; initialPrimaryId: string | null }) {
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [primaryId, setPrimaryId] = useState(initialPrimaryId ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) setOpen(false);
    };
    const stopDismissal = listenForDropdownDismissal(
      () => searchRef.current?.querySelector(".admin-unit-options"),
      (target) => target instanceof Node && Boolean(searchRef.current?.contains(target)),
      () => setOpen(false),
    );
    document.addEventListener("pointerdown", closeOutside);
    return () => { document.removeEventListener("pointerdown", closeOutside); stopDismissal(); };
  }, [open]);
  useLayoutEffect(() => () => {
    setSelectedIds(initialIds);
    setPrimaryId(initialPrimaryId ?? "");
    setQuery("");
    setOpen(false);
  }, [initialIds, initialPrimaryId]);
  const selected = selectedIds.flatMap((id) => options.find((option) => option.id === id) ?? []);
  const matches = options.filter((option) => !selectedIds.includes(option.id) && option.name.toLocaleLowerCase("th").includes(query.trim().toLocaleLowerCase("th"))).slice(0, 8);
  function add(id: string) { setSelectedIds((current) => [...current, id]); setQuery(""); setOpen(true); }
  function remove(id: string) { setSelectedIds((current) => current.filter((value) => value !== id)); if (primaryId === id) setPrimaryId(""); }
  return <div className="admin-unit-picker">
    {selectedIds.map((id) => <input key={id} type="hidden" name="unitIds" value={id}/>) }
    <div ref={searchRef} className="admin-unit-search"><Search size={17}/><input value={query} placeholder="ค้นหาชื่อหน่วยงาน..." onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}/>{open ? <div className="admin-unit-options">{matches.map((option) => <button key={option.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(option.id)}><span>{option.name}</span><Check size={15}/></button>)}{!matches.length ? <p>{options.length ? "ไม่พบหน่วยงานที่เลือกได้" : "ยังไม่มีหน่วยงานในระบบ"}</p> : null}</div> : null}</div>
    <div className="admin-unit-selected"><header><strong>หน่วยงานที่เลือก</strong><span>{selected.length} รายการ</span></header>{selected.length ? <ul>{selected.map((unit) => <li key={unit.id}><span title={unit.name}>{unit.name}</span>{unit.id === primaryId ? <em>หลัก</em> : null}<button type="button" aria-label={`นำ ${unit.name} ออก`} onClick={() => remove(unit.id)}><X size={15}/></button></li>)}</ul> : <p>ยังไม่ได้เลือกหน่วยงาน</p>}</div>
    <label className="admin-primary-unit"><span>หน่วยงานหลัก</span><NativeSelect name="primaryUnitId" value={primaryId} onChange={(event) => setPrimaryId(event.target.value)}><option value="">ไม่ระบุ</option>{selected.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</NativeSelect><small>ใช้สำหรับการแสดงผล โดยสิทธิ์จากทุกหน่วยงานที่สังกัดยังเท่ากัน</small></label>
  </div>;
}
