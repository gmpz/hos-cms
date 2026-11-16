"use client";

import * as Toast from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";

type ToastNotice = {
  id: string;
  title: string;
  description: string;
  variant: "success" | "error";
};

type ToastInput = {
  id?: string | number;
  title: string;
  description: string;
  variant?: "success" | "error";
};

const duration = 3500;
const emptyNotices: ToastNotice[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let notices: ToastNotice[] = emptyNotices;
let nextNoticeId = 0;

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: string) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  notices = notices.filter((notice) => notice.id !== id);
  emit();
}

export function showGlobalToast(input: ToastInput | null) {
  if (!input) return;
  const id = String(++nextNoticeId);
  notices = [...notices, {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant ?? "success",
  }];
  emit();
  timers.set(id, setTimeout(() => dismiss(id), duration));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getNotices() { return notices; }
function getServerNotices() { return emptyNotices; }

export function GlobalToastHost() {
  const active = useSyncExternalStore(subscribe, getNotices, getServerNotices);
  return (
    <Toast.Provider swipeDirection="right">
      {active.map((notice) => (
        <Toast.Root key={notice.id} className="shadcn-toast" data-variant={notice.variant} open onOpenChange={(open) => { if (!open) dismiss(notice.id); }}>
          <span className="shadcn-toast-icon" aria-hidden="true">{notice.variant === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span>
          <div className="shadcn-toast-content"><Toast.Title>{notice.title}</Toast.Title><Toast.Description>{notice.description}</Toast.Description></div>
          <Toast.Close className="shadcn-toast-close" aria-label="ปิดการแจ้งเตือน"><X size={15} /></Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  );
}

export function GlobalToastBridge({ title, description, variant, onClose }: ToastInput & { onClose: () => void }) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    showGlobalToast({ title, description, variant });
    onClose();
  }, [title, description, variant, onClose]);
  return null;
}
