"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminPageSizeSelect } from "./admin-page-size-select";

type PaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  label: string;
  className?: string;
  disabled?: boolean;
} & (
  | { pageHref: string; onPageChange?: never; onPageSizeChange?: never }
  | { pageHref?: never; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }
);

function visiblePages(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  return [...new Set([1, current - 1, current, current + 1, total])]
    .filter((page) => page > 0 && page <= total)
    .sort((left, right) => left - right);
}

function hrefForPage(baseHref: string, page: number) {
  const url = new URL(baseHref, "http://localhost");
  if (page > 1) url.searchParams.set("page", String(page));
  else url.searchParams.delete("page");
  return `${url.pathname}${url.search}`;
}

export function AdminTablePagination(props: PaginationProps) {
  const { page, pageCount, pageSize, total, label, className, disabled = false } = props;
  const pages = visiblePages(page, pageCount);
  const pageHref = props.pageHref;

  function control(target: number, direction: "previous" | "next") {
    const name = direction === "previous" ? "หน้าก่อนหน้า" : "หน้าถัดไป";
    const icon = direction === "previous" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
    if (target < 1 || target > pageCount) {
      return <button type="button" className="admin-pagination-disabled" disabled aria-label={name}>{icon}</button>;
    }
    if (pageHref) return <Link href={hrefForPage(pageHref, target)} aria-label={name}>{icon}</Link>;
    return <button type="button" disabled={disabled} onClick={() => props.onPageChange?.(target)} aria-label={name}>{icon}</button>;
  }

  return <div className={["pages-pagination", "admin-data-table-footer", className].filter(Boolean).join(" ")}>
    <div className="admin-table-footer-layout">
      <div className="admin-table-footer-info">
        {pageHref
          ? <AdminPageSizeSelect value={pageSize} href={pageHref} />
          : <AdminPageSizeSelect value={pageSize} onChange={props.onPageSizeChange} />}
        <p>จาก {total.toLocaleString("th-TH")} รายการ</p>
      </div>
      <nav className="admin-table-pagination-nav" aria-label={label}>
        {control(page - 1, "previous")}
        {pages.map((number, index) => <span className="admin-pagination-page" key={number}>
          {index > 0 && number - pages[index - 1] > 1 ? <i aria-hidden="true">…</i> : null}
          {pageHref
            ? <Link href={hrefForPage(pageHref, number)} className={number === page ? "active" : ""} aria-current={number === page ? "page" : undefined} aria-label={`หน้า ${number}`}>{number}</Link>
            : <button type="button" className={number === page ? "active" : ""} aria-current={number === page ? "page" : undefined} aria-label={`หน้า ${number}`} disabled={disabled} onClick={() => props.onPageChange?.(number)}>{number}</button>}
        </span>)}
        <span className="admin-pagination-current" aria-live="polite">หน้า {page} จาก {pageCount}</span>
        {control(page + 1, "next")}
      </nav>
    </div>
  </div>;
}
