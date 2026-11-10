"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnchoredSelect } from "@/components/ui/anchored-select";
import { NativeSelect } from "@/components/ui/native-select";
import { categoriesChangedEvent, readCategories, refreshCategories } from "../demo/storage";
import type { CategoryScope, DemoCategory } from "../types";

type CategorySelectProps = {
  scope: CategoryScope;
  value: string | null;
  onChange: (id: string | null, name: string) => void;
  allowAll?: boolean;
  label?: string;
  showManageLink?: boolean;
  selectId?: string;
  error?: string;
  anchoredMenu?: boolean;
  required?: boolean;
};

export function CategorySelect({ scope, value, onChange, allowAll = false, label = "หมวดหมู่", showManageLink = true, selectId, error, anchoredMenu = false, required = false }: CategorySelectProps) {
  // The server and first client render must agree, even when the browser cache is warm.
  // The effect below hydrates cached/API categories after mounting.
  const [categories, setCategories] = useState<DemoCategory[]>([]);
  useEffect(() => {
    const refresh = (event?: Event) => { if (!(event instanceof CustomEvent) || event.detail?.scope === scope) setCategories(readCategories(scope)); };
    const timer = window.setTimeout(refresh, 0);
    const refreshFromServer = () => { void refreshCategories(scope).catch(() => undefined); };
    refreshFromServer();
    window.addEventListener(categoriesChangedEvent, refresh);
    window.addEventListener("focus", refreshFromServer);
    return () => { window.clearTimeout(timer); window.removeEventListener(categoriesChangedEvent, refresh); window.removeEventListener("focus", refreshFromServer); };
  }, [scope]);
  const choices = categories.filter((item) => item.active || item.id === value);
  const selectedValue = value && choices.some((item) => item.id === value) ? value : allowAll ? "all" : "";
  const selectCategory = (nextValue: string) => {
    if (nextValue === "all") onChange(null, "ทั้งหมด");
    else { const selected = categories.find((item) => item.id === nextValue); if (selected) onChange(selected.id, selected.name); }
  };
  const optionLabel = (item: DemoCategory) => {
    return `${item.name}${item.active ? "" : " (ปิดใช้งาน)"}`;
  };
  return <div className={`category-select-field${error ? " field-invalid" : ""}`}><span>{label}{required ? <> <em className="admin-required-mark" aria-hidden="true">*</em></> : null}</span><div>{anchoredMenu ? <AnchoredSelect value={selectedValue} label={label} invalid={Boolean(error)} describedBy={error && selectId ? `${selectId}-error` : undefined} options={[allowAll ? { value: "all", label: "ทุกหมวดหมู่" } : { value: "", label: "กรุณาเลือกหมวดหมู่", disabled: true }, ...choices.map((item) => ({ value: item.id, label: optionLabel(item) }))]} onChange={selectCategory} /> : <NativeSelect id={selectId} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error && selectId ? `${selectId}-error` : undefined} required={required} value={selectedValue} onChange={(event) => selectCategory(event.target.value)}>{allowAll ? <option value="all">ทุกหมวดหมู่</option> : <option value="" disabled>กรุณาเลือกหมวดหมู่</option>}{choices.map((item) => <option key={item.id} value={item.id} title={item.name}>{optionLabel(item)}</option>)}</NativeSelect>}{showManageLink ? <Link href={`/admin/categories?scope=${scope}`} target="_blank" rel="noopener noreferrer" className="category-manage-link">จัดการหมวดหมู่ ↗</Link> : null}</div>{error ? <small id={selectId ? `${selectId}-error` : undefined} className="field-error" role="alert">{error}</small> : null}</div>;
}
