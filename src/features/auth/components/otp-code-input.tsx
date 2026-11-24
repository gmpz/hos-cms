"use client";

import type { Ref } from "react";

type OtpCodeInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
};

export function OtpCodeInput({ id, value, onChange, inputRef, autoFocus = false }: OtpCodeInputProps) {
  return <div className="otp-digits">
    <input ref={inputRef} id={id} className="otp-digits-input" name="code" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} aria-label="รหัสยืนยัน 6 หลัก" required autoFocus={autoFocus} />
    {Array.from({ length: 6 }, (_, index) => <span key={index} className={`otp-digit ${index === value.length ? "is-current" : ""}`} aria-hidden="true">{value[index] ?? ""}</span>)}
  </div>;
}
