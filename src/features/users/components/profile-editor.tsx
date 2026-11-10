"use client";

import { Camera, LoaderCircle, Trash2, Upload, UserRound } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { ActionToast } from "@/components/admin/action-toast";
import { updateOwnProfileAction } from "@/features/users/profile-actions";
import { PersonnelPhotoFocusEditor } from "@/features/units/components/personnel-photo-focus-editor";
import type { PersonnelPhotoFocus } from "@/features/units/demo/model";
import { PhoneFields } from "./phone-fields";

type ProfileOption = { id: string; name: string };
type Props = {
  displayName: string; phone: string; phoneExtension: string; email: string; publishPhone: boolean; publishEmail: boolean;
  personTypeId: string | null; positionId: string | null; levelId: string | null;
  personTypes: ProfileOption[]; positions: ProfileOption[]; levels: ProfileOption[];
  initialPhotoUrl: string | null; initialPhotoFocus: PersonnelPhotoFocus; initialPhotoZoom: number;
};

function ProfileSubmitButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return <button className="primary-button" type="submit" disabled={!dirty || pending}>{pending ? <><LoaderCircle className="profile-submit-spinner" size={16}/>กำลังบันทึก...</> : "บันทึกโปรไฟล์"}</button>;
}

export function ProfileEditor({ displayName, phone, phoneExtension, email, publishPhone, publishEmail, personTypeId, positionId, levelId, personTypes, positions, levels, initialPhotoUrl, initialPhotoFocus, initialPhotoZoom }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [photoFocus, setPhotoFocus] = useState(initialPhotoFocus);
  const [photoZoom, setPhotoZoom] = useState(initialPhotoZoom);
  const [photoAction, setPhotoAction] = useState<"keep" | "replace" | "remove">("keep");
  const [fieldsDirty, setFieldsDirty] = useState(false);
  const [photoToast, setPhotoToast] = useState<{ ok: boolean; title: string; description: string } | null>(null);
  const previewObjectUrl = useRef<string | null>(null);
  const photoDirty = photoAction !== "keep" || photoFocus.x !== initialPhotoFocus.x || photoFocus.y !== initialPhotoFocus.y || photoZoom !== initialPhotoZoom;

  function checkFieldsDirty(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const checked = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ?? false;
    setFieldsDirty(value("displayName").trim() !== displayName || value("personTypeId") !== (personTypeId ?? "") || value("positionId") !== (positionId ?? "") || value("levelId") !== (levelId ?? "") || value("phone") !== phone || value("phoneExtension") !== phoneExtension || value("email") !== email || checked("publishPhone") !== publishPhone || checked("publishEmail") !== publishEmail);
  }

  useEffect(() => () => { if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current); }, []);

  function choosePhoto(file: File) {
    setPhotoToast(null);
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
      if (inputRef.current) inputRef.current.value = "";
      setPhotoToast({ ok: false, title: "เลือกรูปไม่สำเร็จ", description: "รองรับไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" });
      return;
    }
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = URL.createObjectURL(file);
    setPhotoUrl(previewObjectUrl.current);
    setPhotoAction("replace");
    setPhotoFocus({ x: 50, y: 25 });
    setPhotoZoom(100);
  }

  function remove() {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setPhotoUrl(null);
    setPhotoAction(initialPhotoUrl ? "remove" : "keep");
    setPhotoFocus({ x: 50, y: 25 });
    setPhotoZoom(100);
  }

  return <form action={updateOwnProfileAction} className="profile-editor-form" onChange={checkFieldsDirty}>
    {photoToast ? <ActionToast {...photoToast} onClose={() => setPhotoToast(null)}/> : null}
    <input type="hidden" name="profilePhotoAction" value={photoAction}/><input type="hidden" name="profilePhotoFocusX" value={photoFocus.x}/><input type="hidden" name="profilePhotoFocusY" value={photoFocus.y}/><input type="hidden" name="profilePhotoZoom" value={photoZoom}/>
    <section className="profile-form-section">
      <header><h2>ข้อมูลบุคลากร</h2><p>เลือกข้อมูลจากรายการมาตรฐานของโรงพยาบาล</p></header>
      <div className="profile-details-grid">
        <label><span>ชื่อ-นามสกุล</span><input name="displayName" defaultValue={displayName} minLength={2} maxLength={160} autoComplete="name" required/></label>
        <label><span>ประเภทบุคลากร</span><NativeSelect name="personTypeId" defaultValue={personTypeId ?? ""}><option value="">ไม่ระบุ</option>{personTypes.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></label>
        <label><span>ตำแหน่ง</span><NativeSelect name="positionId" defaultValue={positionId ?? ""}><option value="">ไม่ระบุ</option>{positions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></label>
        <label><span>ระดับ</span><NativeSelect name="levelId" defaultValue={levelId ?? ""}><option value="">ไม่ระบุ</option>{levels.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></label>
      </div>
    </section>
    <section className="profile-form-section">
      <header><h2>รูปโปรไฟล์</h2><p>รูปจะแสดงเป็นวงกลมในหน้าโปรไฟล์และข้อมูลบุคลากร</p></header>
      <input ref={inputRef} name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) choosePhoto(file); }}/>
      {photoUrl ? <div className="profile-photo-focus"><PersonnelPhotoFocusEditor imageStyle={{ backgroundImage: `url(${photoUrl})` }} value={photoFocus} onChange={setPhotoFocus} zoom={photoZoom} onZoomChange={setPhotoZoom} actions={<div className="profile-photo-actions"><button type="button" onClick={() => inputRef.current?.click()}><Upload size={15}/>เปลี่ยนรูป</button><button type="button" className="danger" onClick={remove}><Trash2 size={15}/>ลบรูป</button></div>}/></div> : <div className="profile-photo-field"><span className="profile-photo-preview"><UserRound size={34}/><i><Camera size={14}/></i></span><div className="profile-photo-upload-copy"><div><strong>เลือกรูปโปรไฟล์</strong><p>{photoAction === "remove" ? "รูปจะถูกลบเมื่อกดบันทึกโปรไฟล์" : "ไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB"}</p></div><div className="profile-photo-actions"><button type="button" onClick={() => inputRef.current?.click()}><Upload size={15}/>เพิ่มรูป</button></div></div></div>}
    </section>
    <section className="profile-form-section"><header><h2>ข้อมูลติดต่อ</h2><p>กำหนดข้อมูลและเลือกได้ว่าต้องการเผยแพร่บนเว็บไซต์หรือไม่</p></header><div className="profile-contact-grid"><div><PhoneFields phone={phone} extension={phoneExtension}/><label className="profile-publish"><input type="checkbox" name="publishPhone" defaultChecked={publishPhone}/> แสดงโทรศัพท์ในหน้าเว็บไซต์</label></div><div><label><span>อีเมล</span><input name="email" type="email" defaultValue={email} maxLength={254}/></label><label className="profile-publish"><input type="checkbox" name="publishEmail" defaultChecked={publishEmail}/> แสดงอีเมลในหน้าเว็บไซต์</label></div></div></section>
    <footer className="profile-form-footer"><ProfileSubmitButton dirty={fieldsDirty || photoDirty}/></footer>
  </form>;
}
