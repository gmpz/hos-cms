"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { Clock3, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { OtpCodeInput } from "./otp-code-input";
import { confirmTotpAction, disableTotpAction, regenerateRecoveryCodesAction, startTotpAction } from "@/features/auth/totp-actions";

export function StartTotpForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState(startTotpAction, { error: "" });
  const [passwordVisible, setPasswordVisible] = useState(false);
  return <form action={action} className="otp-start-form otp-settings-form" suppressHydrationWarning>
    <label htmlFor="otp-current-password">รหัสผ่านปัจจุบัน</label>
    <div className="otp-form-controls">
      <div className="otp-password-field">
        <input id="otp-current-password" name="currentPassword" type={passwordVisible ? "text" : "password"} autoComplete="current-password" required suppressHydrationWarning />
        <button type="button" className="otp-password-toggle" aria-label={passwordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      <button type="submit" className="otp-primary-button" disabled={pending}>{pending ? "กำลังตรวจสอบ..." : "ยืนยันและเริ่มตั้งค่า"}</button>
    </div>
    {(state.error || expired) && <p className="otp-form-error" role="alert">{state.error || "หมดเวลายืนยันรหัสผ่าน กรุณายืนยันอีกครั้ง"}</p>}
  </form>;
}

type CodeMode = "otp" | "recovery";

function useFailedCodeFocus(attempt: number, mode: CodeMode, clearOtp: () => void, inputRef: React.RefObject<HTMLInputElement | null>, blocked: boolean) {
  const handledAttempt = useRef(0);
  useEffect(() => {
    if (!attempt || handledAttempt.current === attempt) return;
    handledAttempt.current = attempt;
    const frame = requestAnimationFrame(() => {
      if (mode === "otp") clearOtp();
      if (blocked) return;
      inputRef.current?.focus();
      if (mode === "recovery") inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [attempt, mode, clearOtp, inputRef, blocked]);
}

function SettingsLimitNotice({ retryAt }: { retryAt: string | null }) {
  useEffect(() => {
    if (!retryAt) return;
    const wait = new Date(retryAt).getTime() - Date.now();
    if (wait <= 0) { window.location.reload(); return; }
    const timer = window.setTimeout(() => window.location.reload(), wait + 250);
    return () => window.clearTimeout(timer);
  }, [retryAt]);
  if (!retryAt) return null;
  const time = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(retryAt));
  return <div className="otp-settings-limit-notice" role="alert"><Clock3 size={19} aria-hidden="true" /><div><strong>พักการตรวจรหัสชั่วคราว</strong><p>ลองรหัสผิดหลายครั้ง กรุณาลองอีกครั้งหลัง <time dateTime={retryAt}>{time} น.</time></p></div></div>;
}

function VerificationCodeField({ id, mode, value, onModeChange, onValueChange, inputRef }: {
  id: string;
  mode: CodeMode;
  value: string;
  onModeChange: (mode: CodeMode) => void;
  onValueChange: (value: string) => void;
  inputRef: Ref<HTMLInputElement>;
}) {
  return <div className="otp-verification-field">
    <label htmlFor={id}>{mode === "otp" ? "รหัส 6 หลักจากแอป" : "รหัสกู้บัญชี"}</label>
    {mode === "otp" ? <OtpCodeInput id={id} value={value} onChange={onValueChange} inputRef={inputRef} autoFocus /> : <input ref={inputRef} id={id} name="code" className="otp-recovery-input" value={value} onChange={(event) => onValueChange(event.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 18).toUpperCase())} maxLength={18} autoComplete="off" placeholder="กรอกรหัสกู้บัญชี" required />}
    <button type="button" className="otp-verification-switch" onClick={() => { onModeChange(mode === "otp" ? "recovery" : "otp"); onValueChange(""); }}>{mode === "otp" ? "ใช้รหัสกู้บัญชีแทน" : "ใช้รหัสจากแอปแทน"}</button>
  </div>;
}

export function ConfirmTotpForm({ initialBlockedUntil = null }: { initialBlockedUntil?: string | null }) {
  const [state, action, pending] = useActionState(confirmTotpAction, { error: "", retryAt: null as string | null, attempt: 0 });
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const retryAt = state.retryAt ?? initialBlockedUntil;
  useFailedCodeFocus(state.attempt, "otp", () => setCode(""), inputRef, Boolean(retryAt));
  return <div className="otp-form-wrap"><SettingsLimitNotice retryAt={retryAt} /><form action={action} className="otp-settings-form otp-confirm-form"><label htmlFor="otp-setup-code">รหัส 6 หลักจากแอป</label><OtpCodeInput id="otp-setup-code" value={code} onChange={setCode} inputRef={inputRef} /><button type="submit" className="otp-primary-button" disabled={pending || Boolean(retryAt) || code.length !== 6}>{pending ? "กำลังยืนยัน..." : "ยืนยันและเปิดใช้"}</button></form>{state.error && <p className="otp-form-error" role="alert">{state.error}</p>}</div>;
}

export function EnabledTotpSettings({ initialBlockedUntil = null }: { initialBlockedUntil?: string | null }) {
  const [active, setActive] = useState<"recovery" | "disable" | null>(null);
  return <div className="otp-settings-content">
    <div className="otp-action-heading"><KeyRound size={20} /><div><h3>รหัสกู้บัญชี</h3><p>หากยังไม่ได้บันทึก หรือทำรหัสหาย สร้างชุดใหม่ได้ รหัสชุดเดิมจะใช้ไม่ได้ทันที</p></div></div>
    <div className="otp-protected-action">{active === "recovery" ? <RegenerateRecoveryCodesForm initialBlockedUntil={initialBlockedUntil} onCancel={() => setActive(null)} /> : <button type="button" className="otp-secondary-button" onClick={() => setActive("recovery")}>สร้างรหัสกู้บัญชีชุดใหม่</button>}</div>
    <div className="otp-divider" />
    <div className="otp-action-heading"><LockKeyhole size={20} /><div><h3>ปิดการใช้งาน OTP</h3><p>กรอกรหัสเพื่อยืนยันว่าเป็นเจ้าของบัญชี</p></div></div>
    <div className="otp-protected-action">{active === "disable" ? <DisableTotpForm initialBlockedUntil={initialBlockedUntil} onCancel={() => setActive(null)} /> : <button type="button" className="otp-secondary-button" onClick={() => setActive("disable")}>ปิด OTP</button>}</div>
  </div>;
}

function DisableTotpForm({ onCancel, initialBlockedUntil }: { onCancel: () => void; initialBlockedUntil: string | null }) {
  const [mode, setMode] = useState<CodeMode>("otp");
  const [code, setCode] = useState("");
  const [state, action, pending] = useActionState(disableTotpAction, { error: "", done: false, retryAt: null as string | null, attempt: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const retryAt = state.retryAt ?? initialBlockedUntil;
  useFailedCodeFocus(state.attempt, mode, () => setCode(""), inputRef, Boolean(retryAt));
  return <div className="otp-protected-panel"><SettingsLimitNotice retryAt={retryAt} /><form action={action} className="otp-settings-form"><VerificationCodeField id="otp-disable-code" mode={mode} value={code} onModeChange={setMode} onValueChange={setCode} inputRef={inputRef} /><div className="otp-protected-buttons"><button type="submit" className="otp-secondary-button" disabled={pending || Boolean(retryAt) || code.length !== (mode === "otp" ? 6 : 18)}>{pending ? "กำลังดำเนินการ..." : "ยืนยันการปิด OTP"}</button><button type="button" className="otp-cancel-button" onClick={onCancel}>ยกเลิก</button></div></form>{state.error && <p className="otp-form-error" role="alert">{state.error}</p>}{state.done && <p className="otp-form-success" role="status">ปิด OTP แล้ว</p>}</div>;
}

function RegenerateRecoveryCodesForm({ onCancel, initialBlockedUntil }: { onCancel: () => void; initialBlockedUntil: string | null }) {
  const [mode, setMode] = useState<CodeMode>("otp");
  const [code, setCode] = useState("");
  const [state, action, pending] = useActionState(regenerateRecoveryCodesAction, { error: "", retryAt: null as string | null, attempt: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const retryAt = state.retryAt ?? initialBlockedUntil;
  useFailedCodeFocus(state.attempt, mode, () => setCode(""), inputRef, Boolean(retryAt));
  return <div className="otp-protected-panel"><SettingsLimitNotice retryAt={retryAt} /><form action={action} className="otp-settings-form"><VerificationCodeField id="otp-regenerate-code" mode={mode} value={code} onModeChange={setMode} onValueChange={setCode} inputRef={inputRef} /><div className="otp-protected-buttons"><button type="submit" className="otp-secondary-button" disabled={pending || Boolean(retryAt) || code.length !== (mode === "otp" ? 6 : 18)}>{pending ? "กำลังสร้าง..." : "ยืนยันและสร้างชุดใหม่"}</button><button type="button" className="otp-cancel-button" onClick={onCancel}>ยกเลิก</button></div></form>{state.error && <p className="otp-form-error" role="alert">{state.error}</p>}</div>;
}
