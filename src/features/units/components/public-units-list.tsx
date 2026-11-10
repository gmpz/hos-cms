"use client";

import Link from "next/link";
import { ArrowRight, Building2, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicPagination } from "@/components/public/public-pagination";
import { getDemoMediaItem, mediaPreviewStyle } from "@/features/media/demo/media-registry";
import { useMediaRevision } from "@/features/media/use-media-revision";
import type { DemoUnit } from "../demo/model";
import { readUnits, refreshUnits, unitsLoaded } from "../demo/storage";
import { unitCoverStyle } from "./unit-cover-style";

const pageSize = 12;
// Temporary delay for previewing the units skeleton.
const unitsLoadingPreviewDelayMs = 1500;

export function PublicUnitsList() {
  useMediaRevision();
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const skeletonStartedAt = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    let timer: number;
    if (loading) {
      timer = window.setTimeout(() => {
        skeletonStartedAt.current = performance.now();
        setShowSkeleton(true);
      }, 180);
    } else {
      const remaining = skeletonStartedAt.current === null ? 0 : Math.max(0, 320 - (performance.now() - skeletonStartedAt.current));
      timer = window.setTimeout(() => {
        setShowSkeleton(false);
        skeletonStartedAt.current = null;
      }, remaining);
    }
    return () => window.clearTimeout(timer);
  }, [loading]);
  useEffect(() => {
    let active = true;
    let previewReady = false;
    const refresh = () => {
      if (!active || !previewReady) return;
      setUnits(readUnits());
      if (unitsLoaded()) setLoading(false);
    };
    const previewTimer = window.setTimeout(() => {
      previewReady = true;
      refresh();
    }, unitsLoadingPreviewDelayMs);
    refresh();
    void refreshUnits().catch(() => {
      if (!active) return;
      setLoadError(true);
      setLoading(false);
    });
    window.addEventListener("storage", refresh);
    window.addEventListener("hos-units-change", refresh);
    return () => {
      active = false;
      window.clearTimeout(previewTimer);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("hos-units-change", refresh);
    };
  }, [retry]);
  const published = units.filter((unit) => unit.status === "published");
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("th");
    if (!keyword) return published;
    return published.filter((unit) => `${unit.name} ${unit.shortName} ${unit.summary}`.toLocaleLowerCase("th").includes(keyword));
  }, [published, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleUnits = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  return <section className="public-units-index">
    <header className="public-units-hero">
      <div><p>หน่วยงานภายในโรงพยาบาล</p><h1>หน่วยงานและกลุ่มงาน</h1><span>ค้นหาข้อมูล บริการ บุคลากร ข่าว และเอกสารของแต่ละหน่วยงาน</span></div>
      <strong><Building2 size={22}/><span>{loading || loadError ? "—" : published.length}</span><small>หน่วยงาน</small></strong>
    </header>
    <div className="public-units-content">
      <div className="public-units-tools">
        <label className="public-search-filter"><span>ค้นหา</span><span className="public-list-search"><Search size={17}/><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="ค้นหาชื่อหน่วยงาน..." aria-label="ค้นหาหน่วยงาน"/></span></label>
        <span>{loading || showSkeleton ? "กำลังโหลดหน่วยงาน..." : loadError ? "โหลดข้อมูลไม่สำเร็จ" : <>พบ <b>{filtered.length}</b> หน่วยงาน</>}</span>
      </div>
      <div aria-busy={loading || showSkeleton}>
      {showSkeleton ? <UnitCardSkeletonGrid /> : loading ? <div className="units-skeleton-delay" /> : loadError ? <div className="public-units-empty" role="alert"><h2>โหลดหน่วยงานไม่สำเร็จ</h2><button type="button" onClick={() => { setLoadError(false); setLoading(true); setRetry((value) => value + 1); }}>ลองใหม่</button></div> : filtered.length ? <><div className="public-units-grid">{visibleUnits.map((unit) => <UnitCard unit={unit} key={unit.id}/>)}</div><PublicPagination currentPage={safePage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} label="เปลี่ยนหน้ารายการหน่วยงาน" /></> : <div className="public-units-empty"><Search size={30}/><h2>ไม่พบหน่วยงาน</h2><p>ลองเปลี่ยนคำค้นหาแล้วค้นหาอีกครั้ง</p></div>}
      </div>
    </div>
  </section>;
}

function UnitCardSkeletonGrid() {
  return <div className="public-units-grid" role="status" aria-label="กำลังโหลดหน่วยงาน">
    {Array.from({ length: 6 }, (_, index) => <article className="public-unit-card unit-card-skeleton" key={index} aria-hidden="true">
      <span className="public-unit-card-cover news-skeleton-block" />
      <span className="public-unit-card-body">
        <span className="news-skeleton-block unit-skeleton-title" />
        <span className="public-unit-card-meta"><span className="news-skeleton-block" /><span className="news-skeleton-block" /></span>
      </span>
    </article>)}
  </div>;
}

function UnitCard({ unit }: { unit: DemoUnit }) {
  const cover = getDemoMediaItem(unit.coverMediaId);
  const coverStyle = unit.coverImageUrl ? { backgroundImage: `url(${unit.coverImageUrl})` } : mediaPreviewStyle(cover);
  return <Link className="public-unit-card" href={`/units/${unit.slug}`}>
    <span className={`public-unit-card-cover ${coverStyle ? "has-cover" : "fallback"}`}>
      {coverStyle ? <span className="unit-cover-image-layer" style={unitCoverStyle(coverStyle, unit.coverFocus ?? { x: 50, y: 50 })} aria-hidden="true"/> : <Building2 size={38}/>}
    </span>
    <span className="public-unit-card-body">
      <h2>{unit.name}</h2>
      <span className="public-unit-card-meta"><span><UsersRound size={14}/>{unit.personnel.length} บุคลากร</span><b>ดูรายละเอียด <ArrowRight size={14}/></b></span>
    </span>
  </Link>;
}
