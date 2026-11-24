"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopySetupKeyButton({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(secret); setCopied(true); }
    catch { setCopied(false); }
  }
  return <button type="button" className="otp-key-copy" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "คัดลอกแล้ว" : "คัดลอกคีย์"}</button>;
}
