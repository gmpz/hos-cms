"use client";
import "./users-import.css";
import { AdminTablePagination } from "@/components/admin/admin-table-pagination";

import { KeyRound, Lock, LogOut, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2, Unlock, Upload, UserRound, X } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActionToast } from "@/components/admin/action-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PasswordPolicyField } from "@/features/auth/components/password-policy-field";
import { isValidPassword } from "@/features/auth/password-policy.mjs";
import { personnelPhotoPositionStyle } from "@/features/units/components/personnel-photo-position";
import { createUserAction, unlockLoginAction, deleteUserAction, resetPasswordAction, revokeSessionsAction, setUserStatusAction, updateUserAction, type UserActionResult } from "../actions";

type ManagedUserView = {
  id: string; username: string; displayName: string; role: "ADMIN" | "MEMBER"; status: "ACTIVE" | "DISABLED"; lockedUntil: Date | null; lastLoginAt: Date | null; createdAt: Date;
  personTypeId: string | null; positionId: string | null; levelId: string | null; profileMediaId: string | null; phone: string; email: string;
  photoUrl: string | null; profilePhotoFocusX: number; profilePhotoFocusY: number; profilePhotoZoom: number;
  publishPhone: boolean; publishEmail: boolean; unitIds: string[]; primaryUnitId: string | null;
};
type Option = { id: string; name: string };
type ProfileOptions = { personTypes: Option[]; positions: Option[]; levels: Option[]; units: Option[]; media: Option[] };
type Dialog = { kind: "create" } | { kind: "edit" | "password"; user: ManagedUserView } | null;
type Action = (formData: FormData) => Promise<UserActionResult>;
type AccountField = "username" | "displayName" | "password";



function UserMoreActions({ user, isCurrent, pending, isLocked, onUnlock, onPassword, onRevoke, onDelete }:  { user: ManagedUserView; isCurrent: boolean; pending: boolean; isLocked: boolean; onUnlock: () => void; onPassword: () => void; onRevoke: () => void; onDelete: () => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setPosition(null);
    };
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPosition(null); triggerRef.current?.focus(); }
    };
    const close = () => setPosition(null);
    const stopDismissal = listenForDropdownDismissal(
      () => menuRef.current,
      (target) => target instanceof Node && Boolean(triggerRef.current?.contains(target) || menuRef.current?.contains(target)),
      () => setPosition(null),
    );
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnKey);

    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnKey);
      stopDismissal();
      window.removeEventListener("resize", close);
    };
  }, [position]);

  function toggle() {
    if (position) { setPosition(null); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 205;
    const height = (isCurrent ? 92 : 132) + (isLocked ? 40 : 0);
    setPosition({
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
    });
  }

  return <>
    <button ref={triggerRef} type="button" title="ตัวเลือกเพิ่มเติม" aria-label={`ตัวเลือกเพิ่มเติมสำหรับ ${user.displayName}`} aria-haspopup="menu" aria-expanded={Boolean(position)} disabled={pending} onClick={toggle}><MoreHorizontal size={18}/></button>
    {position ? createPortal(<div ref={menuRef} className="users-actions-menu" role="menu" style={position}>
      {isLocked ? <button type="button" role="menuitem" onClick={() => { setPosition(null); onUnlock(); }}><Unlock size={16}/>ปลดล็อกการเข้าสู่ระบบ</button> : null}
      <button type="button" role="menuitem" onClick={() => { setPosition(null); onPassword(); }}><KeyRound size={16}/>ตั้งรหัสผ่าน</button>
      <button type="button" role="menuitem" onClick={() => { setPosition(null); onRevoke(); }}><LogOut size={16}/>ออกจากระบบทุกอุปกรณ์</button>
      {!isCurrent ? <button type="button" role="menuitem" className="danger" onClick={() => { setPosition(null); onDelete(); }}><Trash2 size={16}/>ลบบัญชี</button> : null}
    </div>, document.body) : null}
  </>;
}

export function UsersManager({ users, currentUserId, profileOptions, serverNow }: { users: ManagedUserView[]; currentUserId: string; profileOptions: ProfileOptions; serverNow: number }) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const offset = serverNow - Date.now();
    const timer = window.setInterval(() => setNow(Date.now() + offset), 1000);
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [serverNow, router]);
  const [dialog, setDialogState] = useState<Dialog>(null);
  const [accountErrors, setAccountErrors] = useState<Partial<Record<AccountField, string>>>({});
  function setDialog(next: Dialog) {
    setAccountErrors({});
    setDialogState(next);
  }
  const [toast, setToast] = useState<UserActionResult | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<{ action: Action; formData: FormData; message: string; after?: () => void; title?: string; confirmLabel?: string; variant?: "danger" | "default" } | null>(null);
  const filtered = useMemo(() => users.filter((user) => (status === "ALL" || user.status === status) && `${user.displayName} ${user.username} ${user.email}`.toLocaleLowerCase("th").includes(search.trim().toLocaleLowerCase("th"))), [users, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const optionName = (options: Option[], id: string | null) => options.find((item) => item.id === id)?.name ?? "ไม่ระบุ";

  function focusAccountField(field: AccountField) {
    window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`.user-account-dialog input[name="${field}"]`)?.focus());
  }
  function showAccountErrors(errors: Partial<Record<AccountField, string>>) {
    setAccountErrors(errors);
    const first = (["username", "displayName", "password"] as const).find((field) => errors[field]);
    if (first) focusAccountField(first);
  }
  function clearAccountError(field: AccountField) {
    setAccountErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  }

  function run(action: Action, formData: FormData, confirmation?: string, after?: () => void) {
    if (confirmation) { setConfirmation({ action, formData, message: confirmation, after }); return; }
    execute(action, formData, after);
  }
  function execute(action: Action, formData: FormData, after?: () => void) {
    setToast(null);
    startTransition(async () => { const result = await action(formData); if (!result.ok && action === resetPasswordAction && result.message === "รหัสผ่านไม่ครบตามเงื่อนไขที่กำหนด") { showAccountErrors({ password: result.message }); return; } setToast(result); if (result.ok) { after?.(); setDialog(null); router.refresh(); } });
  }
  function createNewUser(formData: FormData) {
    const username = String(formData.get("username") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const errors: Partial<Record<AccountField, string>> = {};
    if (!/^[A-Za-z0-9._-]{3,80}$/.test(username)) errors.username = "กรุณากรอกชื่อผู้ใช้ 3–80 ตัว โดยใช้อักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง";
    if (displayName.length < 2 || displayName.length > 160) errors.displayName = "กรุณากรอกชื่อ-นามสกุล 2–160 ตัวอักษร";
    if (!isValidPassword(password)) errors.password = "รหัสผ่านยังไม่ครบตามเงื่อนไข";
    if (Object.keys(errors).length) { showAccountErrors(errors); return; }
    setAccountErrors({});
    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result.ok && result.userId) {
        setDialog(null);
        router.push(`/admin/users/${result.userId}/edit`);
        return;
      }
      if (result.message === "ชื่อผู้ใช้นี้มีอยู่แล้ว") showAccountErrors({ username: result.message });
      else if (result.message === "รหัสผ่านไม่ครบตามเงื่อนไขที่กำหนด") showAccountErrors({ password: result.message });
      else if (result.message === "กรุณาตรวจสอบชื่อผู้ใช้และชื่อที่แสดง") showAccountErrors({ username: result.message, displayName: result.message });
      else setToast(result);
    });
  }

  return <main className="users-manager users-table-page">
    <header><div><h1>บัญชีผู้ใช้งาน</h1><p>จัดการบัญชี โปรไฟล์ บทบาท และหน่วยงานของบุคลากร</p></div><div className="users-header-actions"><Link href="/admin/users/import" className="users-import-link"><Upload size={17}/>นำเข้าจาก Excel</Link><button type="button" className="primary-button users-add-button" onClick={() => { setAccountErrors({}); setDialog({ kind: "create" }); }}><Plus size={17}/>เพิ่มผู้ใช้งาน</button></div></header>
    {toast ? <ActionToast ok={toast.ok} title={toast.ok ? "ดำเนินการสำเร็จ" : "ดำเนินการไม่สำเร็จ"} description={toast.message} onClose={() => setToast(null)}/> : null}
    <section className="users-table-card admin-data-table">
      <div className="users-table-toolbar"><div className="users-search"><Search size={17}/><input type="search" placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรืออีเมล" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}/></div><NativeSelect value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="ALL">ทุกสถานะ</option><option value="ACTIVE">ใช้งาน</option><option value="DISABLED">ปิดใช้งาน</option></NativeSelect></div>
      <div className="users-table-scroll admin-data-table-scroll"><table className="users-table"><thead><tr><th>ผู้ใช้งาน</th><th>ข้อมูลบุคลากร</th><th>บทบาท</th><th>สถานะ</th><th>เข้าสู่ระบบล่าสุด</th><th className="admin-table-actions-heading">จัดการ</th></tr></thead><tbody>{visible.map((user) => { const isCurrent = user.id === currentUserId; const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > now); return <tr key={user.id}><td><div className="users-table-person admin-table-primary"><span className={user.photoUrl ? "has-photo" : ""} style={user.photoUrl ? { backgroundImage: `url(${user.photoUrl})`, ...personnelPhotoPositionStyle({ x: user.profilePhotoFocusX, y: user.profilePhotoFocusY }, user.profilePhotoZoom) } : undefined}>{user.photoUrl ? null : <UserRound size={18}/>}</span><div><strong>{user.displayName}{isCurrent ? <em>คุณ</em> : null}</strong><small>@{user.username}</small></div></div></td><td><strong>{optionName(profileOptions.positions, user.positionId)}</strong><small>{optionName(profileOptions.personTypes, user.personTypeId)} · {optionName(profileOptions.levels, user.levelId)}</small></td><td><span className="users-role"><ShieldCheck size={14}/>{user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "บุคลากร"}</span></td><td><div className="users-account-status"><span className={`users-status ${user.status === "DISABLED" || isLocked ? "disabled" : "active"}`}>{user.status === "DISABLED" ? "ปิดใช้งาน" : isLocked ? "ล็อกชั่วคราว" : "ใช้งาน"}</span>{isLocked && user.status === "ACTIVE" ? <small>ถึง {new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(user.lockedUntil!))} น.</small> : null}</div></td><td>{user.lastLoginAt ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(user.lastLoginAt)) : "ยังไม่เคย"}</td><td><div className="users-row-actions admin-table-actions"><Link href={`/admin/users/${user.id}/edit`} title="แก้ไข" aria-label={`แก้ไข ${user.displayName}`}><Pencil size={16}/></Link><button type="button" disabled={isCurrent || pending} className={user.status === "ACTIVE" ? "danger" : "success"} title={user.status === "ACTIVE" ? "ปิดใช้งานบัญชี" : "เปิดใช้งานบัญชี"} aria-label={`${user.status === "ACTIVE" ? "ปิด" : "เปิด"}ใช้งาน ${user.displayName}`} onClick={() => { const data = new FormData(); data.set("id", user.id); data.set("status", user.status === "ACTIVE" ? "DISABLED" : "ACTIVE"); run(setUserStatusAction, data, `${user.status === "ACTIVE" ? "ปิด" : "เปิด"}บัญชี ${user.displayName} หรือไม่?`); }}>{user.status === "ACTIVE" ? <Lock size={16}/> : <Unlock size={16}/>}</button><UserMoreActions user={user} isCurrent={isCurrent} pending={pending} isLocked={isLocked} onUnlock={() => { const data = new FormData(); data.set("id", user.id); setConfirmation({ action: unlockLoginAction, formData: data, title: "ปลดล็อกการเข้าสู่ระบบ?", message: `ปลดล็อกบัญชี “${user.displayName}” (@${user.username}) เพื่อให้ลองเข้าสู่ระบบได้ทันทีหรือไม่? การปลดล็อกนี้ไม่เปลี่ยนรหัสผ่านหรือสถานะปิดใช้งานบัญชี`, confirmLabel: "ปลดล็อก" }); }} onPassword={() => setDialog({ kind: "password", user })} onRevoke={() => { const data = new FormData(); data.set("id", user.id); run(revokeSessionsAction, data, `บังคับให้ ${user.displayName} ออกจากระบบทุกอุปกรณ์หรือไม่?`, isCurrent ? () => router.replace("/login") : undefined); }} onDelete={() => { const data = new FormData(); data.set("id", user.id); setConfirmation({ action: deleteUserAction, formData: data, title: "ลบบัญชีบุคลากรถาวร?", message: `ลบบัญชี “${user.displayName}” (@${user.username}) ถาวรหรือไม่? บัญชีจะเข้าสู่ระบบไม่ได้อีก และการลบนี้กู้คืนไม่ได้`, confirmLabel: "ลบบัญชี", variant: "danger" }); }}/></div></td></tr>; })}</tbody></table>{!visible.length ? <div className="users-table-empty">ไม่พบบัญชีผู้ใช้งาน</div> : null}</div>
      {filtered.length ? <AdminTablePagination page={currentPage} pageCount={pages} pageSize={pageSize} total={filtered.length} label="เปลี่ยนหน้าบัญชีผู้ใช้งาน" onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}/> : null}
    </section>
    {dialog?.kind === "create" ? <UserDialog title="เพิ่มผู้ใช้งาน" description="" className="user-account-dialog" onClose={() => setDialog(null)}><form noValidate onSubmit={(event) => { event.preventDefault(); createNewUser(new FormData(event.currentTarget)); }}><div className="user-dialog-scroll"><div className="user-account-fields"><label><span>ชื่อผู้ใช้</span><input name="username" pattern="[A-Za-z0-9._-]{3,80}" minLength={3} maxLength={80} autoComplete="off" placeholder="เช่น somchai.k" required aria-invalid={Boolean(accountErrors.username)} aria-describedby={accountErrors.username ? "user-account-username-error" : undefined} onChange={() => clearAccountError("username")}/>{accountErrors.username ? <small id="user-account-username-error" className="user-account-field-error" role="alert">{accountErrors.username}</small> : null}<small>ใช้ตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง</small></label><label><span>ชื่อ-นามสกุล</span><input name="displayName" minLength={2} maxLength={160} autoComplete="name" placeholder="ชื่อที่ใช้แสดงในระบบ" required aria-invalid={Boolean(accountErrors.displayName)} aria-describedby={accountErrors.displayName ? "user-account-display-name-error" : undefined} onChange={() => clearAccountError("displayName")}/>{accountErrors.displayName ? <small id="user-account-display-name-error" className="user-account-field-error" role="alert">{accountErrors.displayName}</small> : null}</label><PasswordPolicyField name="password" label="รหัสผ่านเริ่มต้น" error={accountErrors.password} onChange={() => clearAccountError("password")}/><label><span>บทบาท</span><NativeSelect name="role" defaultValue="MEMBER"><option value="MEMBER">บุคลากร</option><option value="ADMIN">ผู้ดูแลระบบ</option></NativeSelect></label></div></div><DialogFooter pending={pending} submitLabel="สร้างและกรอกข้อมูลต่อ" onClose={() => setDialog(null)}/></form></UserDialog> : null}
    {dialog?.kind === "edit" ? <UserDialog title="แก้ไขบัญชีและโปรไฟล์" description={`@${dialog.user.username}`} onClose={() => setDialog(null)}><form className="user-profile-form" onSubmit={(event) => { event.preventDefault(); run(updateUserAction, new FormData(event.currentTarget)); }}><div className="user-dialog-scroll"><input type="hidden" name="id" value={dialog.user.id}/><input type="hidden" name="profileMediaId" value={dialog.user.profileMediaId ?? ""}/>
      <section className="user-dialog-section"><h3>ข้อมูลบุคลากร</h3><div className="user-profile-grid"><label><span>ชื่อ-นามสกุล</span><input name="displayName" defaultValue={dialog.user.displayName} minLength={2} maxLength={160} required/></label><ProfileSelect name="personTypeId" label="ประเภทบุคลากร" value={dialog.user.personTypeId} options={profileOptions.personTypes}/><ProfileSelect name="positionId" label="ตำแหน่ง" value={dialog.user.positionId} options={profileOptions.positions}/><ProfileSelect name="levelId" label="ระดับ" value={dialog.user.levelId} options={profileOptions.levels}/></div></section>
      <section className="user-dialog-section"><h3>หน่วยงานที่สังกัด</h3><fieldset className="user-unit-fields">{profileOptions.units.length ? profileOptions.units.map((unit) => <label key={unit.id}><input type="checkbox" name="unitIds" value={unit.id} defaultChecked={dialog.user.unitIds.includes(unit.id)}/>{unit.name}</label>) : <small>ยังไม่มีหน่วยงานให้เลือก</small>}</fieldset><ProfileSelect name="primaryUnitId" label="หน่วยงานหลัก" value={dialog.user.primaryUnitId} options={profileOptions.units}/></section>
      <section className="user-dialog-section"><h3>ข้อมูลติดต่อและสิทธิ์</h3><div className="user-profile-grid"><label><span>โทรศัพท์</span><input name="phone" defaultValue={dialog.user.phone} maxLength={40}/><small><input type="checkbox" name="publishPhone" defaultChecked={dialog.user.publishPhone}/> แสดงต่อสาธารณะ</small></label><label><span>อีเมล</span><input name="email" type="email" defaultValue={dialog.user.email} maxLength={254}/><small><input type="checkbox" name="publishEmail" defaultChecked={dialog.user.publishEmail}/> แสดงต่อสาธารณะ</small></label><label><span>บทบาท</span>{dialog.user.id === currentUserId ? <><input type="hidden" name="role" value={dialog.user.role}/><NativeSelect value={dialog.user.role} disabled><option value="ADMIN">ผู้ดูแลระบบ</option></NativeSelect></> : <NativeSelect name="role" defaultValue={dialog.user.role}><option value="MEMBER">บุคลากร</option><option value="ADMIN">ผู้ดูแลระบบ</option></NativeSelect>}</label></div></section></div><DialogFooter pending={pending} submitLabel="บันทึกข้อมูล" onClose={() => setDialog(null)}/></form></UserDialog> : null}
    {dialog?.kind === "password" ? <UserDialog title="ตั้งรหัสผ่านใหม่" description={dialog.user.displayName} className="user-account-dialog" onClose={() => setDialog(null)}><form noValidate onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); if (!isValidPassword(String(data.get("password") ?? ""))) { showAccountErrors({ password: "รหัสผ่านยังไม่ครบตามเงื่อนไข" }); return; } setAccountErrors({}); run(resetPasswordAction, data, "รีเซ็ตรหัสผ่านและให้บัญชีนี้ออกจากระบบทุกอุปกรณ์หรือไม่?", dialog.user.id === currentUserId ? () => router.replace("/login") : undefined); }}><div className="user-dialog-scroll"><input type="hidden" name="id" value={dialog.user.id}/><div className="user-account-fields"><PasswordField error={accountErrors.password} onChange={() => clearAccountError("password")}/></div></div><DialogFooter pending={pending} submitLabel="รีเซ็ตรหัสผ่าน" onClose={() => setDialog(null)}/></form></UserDialog> : null}
    {confirmation ? <ConfirmDialog title={confirmation.title ?? "ยืนยันการดำเนินการ"} description={confirmation.message} confirmLabel={confirmation.confirmLabel ?? "ยืนยัน"} variant={confirmation.variant ?? "default"} onClose={() => setConfirmation(null)} onConfirm={() => { const current = confirmation; setConfirmation(null); execute(current.action, current.formData, current.after); }}/> : null}
  </main>;
}

function ProfileSelect({ name, label, value, options }: { name: string; label: string; value: string | null; options: Option[] }) { return <label><span>{label}</span><NativeSelect name={name} defaultValue={value ?? ""}><option value="">ไม่ระบุ</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</NativeSelect></label>; }
function PasswordField({ error, onChange }: { error?: string; onChange: () => void }) { return <><PasswordPolicyField name="password" label="รหัสผ่านใหม่" autoFocus error={error} onChange={onChange}/><p className="user-password-reset-hint">ผู้ใช้จะต้องเปลี่ยนรหัสผ่านอีกครั้งเมื่อเข้าสู่ระบบ</p></>; }
function DialogFooter({ pending, submitLabel, onClose }: { pending: boolean; submitLabel: string; onClose: () => void }) { return <footer><button type="button" onClick={onClose}>ยกเลิก</button><button type="submit" className="primary-button" disabled={pending}>{pending ? "กำลังบันทึก…" : submitLabel}</button></footer>; }
function UserDialog({ title, description, onClose, children, className }: { title: string; description: string; onClose: () => void; children: React.ReactNode; className?: string }) { return <div className="modal-layer"><button type="button" className="modal-backdrop" aria-label="ปิด" onClick={onClose}/><div className={["user-dialog", className].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2><p>{description}</p></div><button type="button" aria-label="ปิด" onClick={onClose}><X size={19}/></button></header>{children}</div></div>; }
