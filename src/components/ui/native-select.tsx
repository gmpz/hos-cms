"use client";

import { Check, ChevronDown } from "lucide-react";
import { Children, createElement, forwardRef, isValidElement, type ChangeEvent, type ReactNode, type SelectHTMLAttributes, useEffect, useRef, useState } from "react";
import { listenForDropdownDismissal } from "./dropdown-scroll";

type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

function optionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  return isValidElement<{ children?: ReactNode }>(node) ? optionText(node.props.children) : "";
}

function collectOptions(children: ReactNode): { value: string; label: string; disabled: boolean }[] {
  const options: { value: string; label: string; disabled: boolean }[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === "option") {
      options.push({ value: String(child.props.value ?? optionText(child.props.children)), label: optionText(child.props.children), disabled: Boolean(child.props.disabled) });
    } else if (child.props.children) {
      options.push(...collectOptions(child.props.children));
    }
  });
  return options;
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(function NativeSelect(
  { children, className, ...props },
  ref,
) {
  const [hydrated, setHydrated] = useState(false);
  const [insideSettings, setInsideSettings] = useState(false);
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(240);
  const [localValue, setLocalValue] = useState(String(props.defaultValue ?? ""));
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const options = collectOptions(children);
  const selectedValue = String(props.value ?? (localValue || options[0]?.value || ""));
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    setHydrated(true);
    setInsideSettings(Boolean(selectRef.current?.closest(".block-settings-layer")));
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    const stopDismissal = listenForDropdownDismissal(
      () => rootRef.current?.querySelector(".drawer-inline-select-options"),
      (target) => target instanceof Node && Boolean(rootRef.current?.contains(target)),
      () => setOpen(false),
    );
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      stopDismissal();
    };
  }, [open]);

  useEffect(() => {
    if (insideSettings) return;
    const closeNativePicker = (event: WheelEvent | TouchEvent) => {
      const select = selectRef.current;
      if (select?.matches(":open") && event.target !== select) select.blur();
    };
    document.addEventListener("wheel", closeNativePicker, true);
    document.addEventListener("touchmove", closeNativePicker, true);
    return () => {
      document.removeEventListener("wheel", closeNativePicker, true);
      document.removeEventListener("touchmove", closeNativePicker, true);
    };
  }, [insideSettings]);

  const setSelectRef = (element: HTMLSelectElement | null) => {
    selectRef.current = element;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  };

  const selectOption = (value: string) => {
    if (!selectRef.current) return;
    selectRef.current.value = value;
    setLocalValue(value);
    props.onChange?.({ target: selectRef.current, currentTarget: selectRef.current } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const toggleInlineMenu = () => {
    if (!open) {
      const trigger = rootRef.current?.querySelector(".drawer-inline-select-trigger");
      const drawer = rootRef.current?.closest(".block-settings");
      if (trigger && drawer) {
        const field = trigger.getBoundingClientRect();
        const bounds = drawer.getBoundingClientRect();
        const menuHeight = Math.min(240, options.length * 38 + 10);
        const below = bounds.bottom - field.bottom;
        const headerBottom = drawer.querySelector(":scope > header")?.getBoundingClientRect().bottom ?? bounds.top;
        const above = field.top - headerBottom;
        const shouldOpenAbove = below < menuHeight && above > below;
        setOpenAbove(shouldOpenAbove);
        setMenuMaxHeight(Math.max(80, Math.min(240, (shouldOpenAbove ? above : below) - 8)));
      }
    }
    setOpen((value) => !value);
  };

  if (insideSettings) {
    return (
      <span ref={rootRef} className="drawer-inline-select">
        <select ref={setSelectRef} className="drawer-inline-select-native" tabIndex={-1} aria-hidden="true" {...props}>{children}</select>
        <button type="button" className={["drawer-inline-select-trigger", className].filter(Boolean).join(" ")} disabled={props.disabled} aria-haspopup="listbox" aria-expanded={open} onClick={toggleInlineMenu} onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
        }}>
          <span>{selectedOption?.label}</span><ChevronDown size={16} aria-hidden="true" />
        </button>
        {open ? <span className={`drawer-inline-select-options${openAbove ? " drawer-inline-select-options-above" : ""}`} role="listbox" style={{ maxHeight: menuMaxHeight }}>
          {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === selectedValue} disabled={option.disabled} onClick={() => selectOption(option.value)}><span className="drawer-inline-select-check" aria-hidden="true">{option.value === selectedValue ? <Check size={16} strokeWidth={2} /> : null}</span><span>{option.label}</span></button>)}
        </span> : null}
      </span>
    );
  }

  return (
    <select ref={setSelectRef} className={["cms-native-select", className].filter(Boolean).join(" ")} {...props}>
      {hydrated ? (
        <button className="native-select-display">{createElement("selectedcontent")}</button>
      ) : null}
      {children}
    </select>
  );
});
