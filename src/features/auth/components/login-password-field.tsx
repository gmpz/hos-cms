"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function LoginPasswordField() {
  const [visible, setVisible] = useState(false);

  return <label>
    <span>รหัสผ่าน</span>
    <div className="password-policy-input">
      <input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required />
      <button type="button" aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  </label>;
}
