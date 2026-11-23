"use client";
import { PublicImageLoading } from "@/components/public/public-image-loading";


import Link from "next/link";
import { ArrowRight, Building2, Search, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PublicPagination } from "@/components/public/public-pagination";
import type { PublicUnitListItem, PublicUnitListPage } from "../public-unit-list-page";
import { unitCoverStyle } from "./unit-cover-style";

const pageSize = 20;

export function PublicUnitsList({ initialPage }: { initialPage: PublicUnitListPage }) {
  const [result, setResult] = useState(initialPage);
  const [loadedKey, setLoadedKey] = useState(JSON.stringify([1, "", 0]));
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const initialRequest = useRef(true);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const requestKey = JSON.stringify([currentPage, debouncedQuery, retry]);
  const showSkeleton = query.trim() !== debouncedQuery || loadedKey !== requestKey;
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (initialRequest.current) { initialRequest.current = false; return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(currentPage), search: debouncedQuery });
    void fetch(`/api/units/public-list?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("โหลดหน่วยงานไม่สำเร็จ");
        return await response.json() as PublicUnitListPage;
      })
      .then((page) => {
        if (controller.signal.aborted) return;
        setResult(page);
        setCurrentPage(page.page);
        setLoadedKey(JSON.stringify([page.page, debouncedQuery, retry]));
        setLoadError(false);
      })
      .catch(() => { if (!controller.signal.aborted) { setLoadError(true); setLoadedKey(requestKey); } });
    return () => controller.abort();
  }, [currentPage, debouncedQuery, retry, requestKey]);
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleUnits = result.items;
  const skeletonCount = currentPage > 1
    ? Math.max(1, Math.min(pageSize, result.total - (currentPage - 1) * pageSize))
    : pageSize;
  return <section className="public-units-index">
    <header className="public-units-hero">
      <div><p>หน่วยงานภายในโรงพยาบาล</p><h1>หน่วยงานและกลุ่มงาน</h1><span>ค้นหาข้อมูล บริการ บุคลากร ข่าว และเอกสารของแต่ละหน่วยงาน</span></div>
      <strong><Building2 size={22}/><span>{showSkeleton || loadError ? "—" : result.total}</span><small>หน่วยงาน</small></strong>
    </header>
    <div className="public-units-content">
      <div className="public-units-tools">
        <label className="public-search-filter"><span>ค้นหา</span><span className="public-list-search"><Search size={17}/><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="ค้นหาชื่อหน่วยงาน..." aria-label="ค้นหาหน่วยงาน"/></span></label>
        <span>{showSkeleton ? "กำลังโหลดหน่วยงาน..." : loadError ? "โหลดข้อมูลไม่สำเร็จ" : <>พบ <b>{result.total}</b> หน่วยงาน</>}</span>
      </div>
      <div aria-busy={showSkeleton}>
      {showSkeleton ? <UnitCardSkeletonGrid count={skeletonCount} /> : loadError ? <div className="public-units-empty" role="alert"><h2>โหลดหน่วยงานไม่สำเร็จ</h2><button type="button" onClick={() => { setLoadError(false); setRetry((value) => value + 1); }}>ลองใหม่</button></div> : result.total ? <><div className="public-units-grid">{visibleUnits.map((unit) => <UnitCard unit={unit} key={unit.id}/>)}</div><PublicPagination currentPage={safePage} totalItems={result.total} pageSize={pageSize} onPageChange={setCurrentPage} label="เปลี่ยนหน้ารายการหน่วยงาน" /></> : <div className="public-units-empty"><Search size={30}/><h2>ไม่พบหน่วยงาน</h2><p>ลองเปลี่ยนคำค้นหาแล้วค้นหาอีกครั้ง</p></div>}
      </div>
    </div>
  </section>;
}

export function PublicUnitsSkeleton({ count = pageSize }: { count?: number }) {
  return <section className="public-units-index" role="status" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดหน่วยงาน">
    <header className="public-units-hero">
      <div><p>หน่วยงานภายในโรงพยาบาล</p><h1>หน่วยงานและกลุ่มงาน</h1><span>ค้นหาข้อมูล บริการ บุคลากร ข่าว และเอกสารของแต่ละหน่วยงาน</span></div>
      <strong><Building2 size={22}/><span>—</span><small>หน่วยงาน</small></strong>
    </header>
    <div className="public-units-content">
      <div className="public-units-tools">
        <label className="public-search-filter"><span>ค้นหา</span><span className="public-list-search"><Search size={17}/><input type="search" disabled placeholder="ค้นหาชื่อหน่วยงาน..." aria-label="ค้นหาหน่วยงาน"/></span></label>
        <span>กำลังโหลดหน่วยงาน...</span>
      </div>
      <UnitCardSkeletonGrid count={count}/>
    </div>
  </section>;
}

function UnitCardSkeletonGrid({ count }: { count: number }) {
  return <div className="public-units-grid" role="status" aria-label="กำลังโหลดหน่วยงาน">
    {Array.from({ length: count }, (_, index) => <article className="public-unit-card unit-card-skeleton" key={index} aria-hidden="true">
      <span className="public-unit-card-cover news-skeleton-block" />
      <span className="public-unit-card-body">
        <span className="news-skeleton-block unit-skeleton-title" />
        <span className="public-unit-card-meta"><span className="news-skeleton-block" /><span className="news-skeleton-block" /></span>
      </span>
    </article>)}
  </div>;
}

function UnitCard({ unit }: { unit: PublicUnitListItem }) {
  const coverStyle = unit.coverImageUrl ? { backgroundImage: `url(${unit.coverImageUrl})` } : undefined;
  return <Link className="public-unit-card" href={`/units/${unit.slug}`}>
    <span className={`public-unit-card-cover ${coverStyle ? "has-cover" : "fallback"}`}>
      {coverStyle ? <span className="unit-cover-image-layer" style={unitCoverStyle(coverStyle, unit.coverFocus ?? { x: 50, y: 50 })} aria-hidden="true"/> : <Building2 size={38}/>}
      <PublicImageLoading src={unit.coverImageUrl}/>
    </span>
    <span className="public-unit-card-body">
      <h2>{unit.name}</h2>
      <span className="public-unit-card-meta"><span><UsersRound size={14}/>{unit.personnelCount} บุคลากร</span><b>ดูรายละเอียด <ArrowRight size={14}/></b></span>
    </span>
  </Link>;
}
