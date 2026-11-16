"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

const adminPageSizes = [10, 20, 50] as const;

export function AdminPageSizeSelect({ value, onChange, href }: {
  value: number;
  onChange?: (size: number) => void;
  href?: string;
}) {
  const router = useRouter();

  function choose(size: number) {
    if (size === value) return;
    if (href) {
      const url = new URL(href, window.location.origin);
      url.searchParams.set("size", String(size));
      url.searchParams.delete("page");
      router.push(`${url.pathname}${url.search}`);
    } else {
      onChange?.(size);
    }
  }

  return <div className="admin-page-size-select">
    <NativeSelect
      className="admin-page-size-dropdown"
      aria-label="จำนวนรายการต่อหน้า"
      value={String(value)}
      onChange={(event) => choose(Number(event.target.value))}
    >
      {adminPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
    </NativeSelect>
  </div>;
}
