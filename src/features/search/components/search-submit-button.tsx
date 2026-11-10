"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SearchSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending}>
    {pending ? <><LoaderCircle className="site-search-button-spinner" size={17} aria-hidden="true"/>กำลังค้นหา…</> : "ค้นหา"}
  </button>;
}
