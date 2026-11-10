"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useId, useState } from "react";
import { isValidPassword, passwordChecks, passwordMinimumLength } from "../password-policy.mjs";

type PasswordPolicyFieldProps = {
  name: string;
  label: string;
  autoFocus?: boolean;
  className?: string;
  error?: string;
  onChange?: () => void;
};

const requirements = [
  ["length", "อย่างน้อย 10 ตัวอักษร"],
  ["uppercase", "ตัวอักษรพิมพ์ใหญ่ A–Z"],
  ["lowercase", "ตัวอักษรพิมพ์เล็ก a–z"],
  ["number", "ตัวเลข 0–9"],
  ["symbol", "สัญลักษณ์พิเศษ เช่น ! @ # $"],
] as const;

export function PasswordPolicyField({ name, label, autoFocus, className, error, onChange }: PasswordPolicyFieldProps) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const requirementsId = useId();
  const errorId = useId();
  const checks = passwordChecks(password);
  const state = password ? "entered" : "idle";

  return <label className={["password-policy-field", className].filter(Boolean).join(" ")}>
    <span>{label}</span>
    <div className="password-policy-input">
      <input
        name={name}
        type={visible ? "text" : "password"}
        value={password}
        minLength={passwordMinimumLength}
        autoComplete="new-password"
        autoFocus={autoFocus}
        aria-describedby={`${requirementsId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        required
        onChange={(event) => {
          const next = event.currentTarget.value;
          setPassword(next);
          event.currentTarget.setCustomValidity(next && !isValidPassword(next) ? "รหัสผ่านยังไม่ครบตามเงื่อนไข" : "");
          onChange?.();
        }}
      />
      <button type="button" aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setVisible((current) => !current)}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
    </div>
    {error ? <small id={errorId} className="user-account-field-error" role="alert">{error}</small> : null}
    <ul id={requirementsId} className="password-policy-checks">
      {requirements.map(([key, text]) => {
        const status = state === "idle" ? "idle" : checks[key] ? "met" : "unmet";
        return <li key={key} className={status}>{status === "met" ? <Check size={14}/> : status === "unmet" ? <X size={14}/> : <span className="password-policy-dot"/>}{text}</li>;
      })}
    </ul>
  </label>;
}

