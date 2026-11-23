"use client";

import { ChevronDown, EyeOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { listenForDropdownDismissal } from "@/components/ui/dropdown-scroll";

type PublishDropdownProps = {
  variant?: "admin" | "announcement";
  disabled?: boolean;
  onUnpublish: () => void;
};

export function PublishDropdown({ variant = "admin", disabled = false, onUnpublish }: PublishDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => { detailsRef.current?.removeAttribute("open"); };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) close();
    };
    const closeOnFocusOutside = (event: FocusEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) return;
      close();
      detailsRef.current?.querySelector("summary")?.focus();
    };
    const stopDismissal = listenForDropdownDismissal(
      () => detailsRef.current?.querySelector(".announcement-publish-menu,.admin-publish-menu"),
      (target) => target instanceof Node && Boolean(detailsRef.current?.contains(target)),
      close,
    );
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOnFocusOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("popstate", close);
    window.addEventListener("pageshow", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOnFocusOutside);
      document.removeEventListener("keydown", closeOnEscape);
      stopDismissal();
      window.removeEventListener("popstate", close);
      window.removeEventListener("pageshow", close);
    };
  }, []);

  const announcement = variant === "announcement";
  return (
    <details ref={detailsRef} className={announcement ? "announcement-publish-dropdown" : "admin-publish-dropdown"}>
      <summary aria-label="ตัวเลือกการเผยแพร่"><ChevronDown size={announcement ? 18 : 17}/></summary>
      <div className={announcement ? "announcement-publish-menu" : "admin-publish-menu"}>
        <button type="button" disabled={disabled} onClick={() => { detailsRef.current?.removeAttribute("open"); onUnpublish(); }}><EyeOff size={16}/>ยกเลิกเผยแพร่</button>
      </div>
    </details>
  );
}
