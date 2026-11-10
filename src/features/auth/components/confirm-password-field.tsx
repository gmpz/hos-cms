"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function ConfirmPasswordField() {
  const [visible, setVisible] = useState(false);

  return <label>
    <span>ยืนยันรหัสผ่านใหม่</span>
    <div className="password-policy-input">
      <input name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" minLength={10} required />
      <button type="button" aria-label={visible ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? <EyeOff size={17}/> : <Eye size={17}/>}
      </button>
    </div>
  </label>;
}
