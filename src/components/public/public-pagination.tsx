"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function paginationItems(current: number, total: number) {
  if (total <= 7)
    return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return [...pages]
    .filter((page) => page > 0 && page <= total)
    .sort((a, b) => a - b);
}

export function PublicPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  label,
}: {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pages = paginationItems(safePage, totalPages);

  return (
    <div className="pages-pagination public-pagination">
      <p>
        แสดง {start + 1}–{Math.min(start + pageSize, totalItems)} จาก{" "}
        {totalItems} รายการ
      </p>
      <nav aria-label={label}>
        <button
          type="button"
          disabled={safePage === 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="หน้าก่อนหน้า"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((page, index) => (
          <span key={page}>
            {index > 0 && page - pages[index - 1] > 1 ? <i>…</i> : null}
            <button
              type="button"
              className={page === safePage ? "active" : ""}
              aria-current={page === safePage ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={safePage === totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="หน้าถัดไป"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
