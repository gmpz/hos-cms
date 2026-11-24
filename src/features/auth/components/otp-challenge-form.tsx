"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { verifyOtpAction } from "@/features/auth/actions";
import { OtpCodeInput } from "./otp-code-input";

function SubmissionStatus({ otp, ready }: { otp: boolean; ready: boolean }) {
  const { pending } = useFormStatus();
  if (otp) return <p className="otp-auto-status" role="status" aria-live="polite">{pending ? <><LoaderCircle size={16} className="otp-loading-icon" /> กำลังตรวจสอบรหัส...</> : "กรอกครบ 6 หลัก ระบบจะตรวจสอบอัตโนมัติ"}</p>;
  return <button type="submit" disabled={!ready || pending}>{pending ? <><LoaderCircle size={17} className="otp-loading-icon" /> กำลังตรวจสอบ...</> : "ยืนยันและเข้าสู่ระบบ"}</button>;
}

export function OtpChallengeForm() {
  const [state, action] = useActionState(verifyOtpAction, { error: "", attempt: 0 });
  const [mode, setMode] = useState<"otp" | "recovery">("otp");
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const otp = mode === "otp";

  useEffect(() => {
    if (otp && value.length === 6 && !submittedRef.current) {
      submittedRef.current = true;
      formRef.current?.requestSubmit();
    }
    if (value.length < 6) submittedRef.current = false;
  }, [otp, value]);

  useEffect(() => {
    if (!state.attempt) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "otp") setValue("");
      inputRef.current?.focus();
      if (mode === "recovery") inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [state.attempt, mode]);

  function switchMode() {
    setMode(otp ? "recovery" : "otp");
    setValue("");
    submittedRef.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return <>
    <form ref={formRef} action={action} className="otp-challenge-form">
      <label htmlFor="otp-challenge-code">{otp ? "รหัส 6 หลักจากแอป" : "รหัสกู้บัญชี"}</label>
      {otp ? <OtpCodeInput id="otp-challenge-code" value={value} onChange={setValue} inputRef={inputRef} autoFocus /> : <input ref={inputRef} id="otp-challenge-code" className="otp-recovery-input" name="code" value={value} onChange={(event) => setValue(event.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 18).toUpperCase())} type="text" autoComplete="off" maxLength={18} placeholder="กรอกรหัสกู้บัญชี" required />}
      <p className="otp-challenge-hint">{otp ? "รหัสจะเปลี่ยนทุก 30 วินาที" : "รหัสกู้บัญชีแต่ละชุดใช้ได้ครั้งเดียว"}</p>
      {state.error && <p className="login-error" role="alert">{state.error}</p>}
      <SubmissionStatus otp={otp} ready={value.length === 18} />
    </form>
    <button type="button" className="otp-mode-switch" onClick={switchMode}>{otp ? "ใช้รหัสกู้บัญชีแทน" : "ใช้รหัสจากแอป Authenticator"}</button>
  </>;
}
