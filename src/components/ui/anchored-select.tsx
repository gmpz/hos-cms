"use client";

import { Check, ChevronDown } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string; description?: string; group?: string; disabled?: boolean };

export function AnchoredSelect({ value, options, onChange, label, invalid = false, describedBy, className = "" }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 0 });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 8;
    const roomBelow = window.innerHeight - rect.bottom - margin * 2;
    const roomAbove = rect.top - margin * 2;
    const menuHeight = Math.min(320, options.length * 42 + 10);
    const above = roomBelow < Math.min(menuHeight, 180) && roomAbove > roomBelow;
    const maxHeight = Math.max(80, Math.min(320, above ? roomAbove : roomBelow));
    const width = Math.min(rect.width, window.innerWidth - margin * 2);
    setPosition({
      top: above ? Math.max(margin, rect.top - Math.min(menuHeight, maxHeight) - 4) : rect.bottom + 4,
      left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
      width,
      maxHeight,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const focusFrame = window.requestAnimationFrame(() => {
      (menuRef.current?.querySelector<HTMLButtonElement>('button[aria-selected="true"]:not(:disabled)') ?? menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus();
    });
    const closeOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, updatePosition]);

  const selected = options.find((option) => option.value === value);
  const resolvePortalTarget = () => triggerRef.current?.closest(".document-editor")
    ?? triggerRef.current?.closest(".admin-shell, .public-shell")
    ?? document.body;
  return <>
    <button
      ref={triggerRef}
      type="button"
      className={`anchored-select-trigger${className ? ` ${className}` : ""}`}
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      title={selected ? `${selected.label}${selected.description ? ` — ${selected.description}` : ""}` : undefined}
      data-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onClick={() => { if (!open) { updatePosition(); setPortalTarget(resolvePortalTarget()); } setOpen((current) => !current); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          updatePosition();
          setPortalTarget(resolvePortalTarget());
          setOpen(true);
        }
      }}
    >
      <span className="anchored-select-copy"><strong>{selected?.label ?? "กรุณาเลือก"}</strong>{selected?.description ? <small>{selected.description}</small> : null}</span><ChevronDown size={17} aria-hidden="true" />
    </button>
    {open && portalTarget && createPortal(
      <div ref={menuRef} id={id} className={`anchored-select-menu${className ? ` ${className}-menu` : ""}`} role="listbox" aria-label={label} style={position} onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        if (!items.length) return;
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}>
        {options.map((option, index) => <Fragment key={option.value}>
          {option.group && option.group !== options[index - 1]?.group ? <div className="anchored-select-group">{option.group}</div> : null}
          <button
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={option.value === value}
            title={`${option.label}${option.description ? ` — ${option.description}` : ""}`}
            disabled={option.disabled}
            onClick={() => { onChange(option.value); setOpen(false); triggerRef.current?.focus(); }}
          >
            <Check size={16} aria-hidden="true" /><span className="anchored-select-copy"><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
          </button>
        </Fragment>)}
      </div>, portalTarget,
    )}
  </>;
}
