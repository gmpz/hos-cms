"use client";

import { GlobalToastBridge } from "@/components/ui/global-toast";

export function ActionToast({ ok, title, description, onClose }: { ok: boolean; title: string; description: string; onClose: () => void }) {
  return <GlobalToastBridge title={title} description={description} variant={ok ? "success" : "error"} onClose={onClose} />;
}
