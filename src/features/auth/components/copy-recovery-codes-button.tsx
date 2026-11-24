"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyRecoveryCodesButton({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch { setCopied(false); }
  }
  return <button type="button" className="otp-copy-button" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "คัดลอกแล้ว" : "คัดลอกรหัสทั้งหมด"}</button>;
}
