"use client";
import { PublicDocumentRow } from "./public-document-row";
import { ContentDataSkeleton } from "@/features/pages/blocks/renderers/content-data-skeleton";

import { FileText, Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PublicPagination } from "@/components/public/public-pagination";
import {
  categoriesChangedEvent,
  readCategories,
} from "@/features/categories/demo/storage";
import type { DemoUnit } from "@/features/units/demo/model";
import { readUnits } from "@/features/units/demo/storage";
import { documentsChangeEvent, fetchPublicDocumentPage, type PublicDocumentPage } from "../demo/storage";

const subscribeToHydration = () => () => undefined;
const pageSize = 20;

export function PublicDocumentsList({
  initialUnit = "all",
  initialCategory = "all",
  initialYear = "latest",
}: {
  initialUnit?: string;
  initialCategory?: string;
  initialYear?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [documentPage, setDocumentPage] = useState<PublicDocumentPage | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [categories, setCategories] = useState(() => readCategories("documents"));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unitId, setUnitId] = useState(initialUnit);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [fiscalYear, setFiscalYear] = useState(initialYear);
  const [currentPage, setCurrentPage] = useState(1);
  const queryKey = JSON.stringify([currentPage, debouncedSearch, categoryId, unitId, fiscalYear, refreshKey]);
  const loading = loadedKey !== queryKey;

  const showSkeleton = loading || search.trim() !== debouncedSearch;
  const skeletonCount = currentPage > 1 && documentPage
    ? Math.max(1, Math.min(pageSize, documentPage.total - (currentPage - 1) * pageSize))
    : pageSize;

  useEffect(() => {
    const refresh = () => {
      setUnits(readUnits().filter((unit) => unit.status === "published"));
      setCategories(readCategories("documents"));
    };
    refresh();
    const reload = () => setRefreshKey((value) => value + 1);
    window.addEventListener(documentsChangeEvent, reload);
    window.addEventListener("hos-units-change", refresh);
    window.addEventListener(categoriesChangedEvent, refresh);
    return () => {
      window.removeEventListener(documentsChangeEvent, reload);
      window.removeEventListener("hos-units-change", refresh);
      window.removeEventListener(categoriesChangedEvent, refresh);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const requestKey = JSON.stringify([currentPage, debouncedSearch, categoryId, unitId, fiscalYear, refreshKey]);
    void fetchPublicDocumentPage({ page: currentPage, search: debouncedSearch, category: categoryId, unit: unitId, year: fiscalYear }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDocumentPage(result);
        setLoadError("");
        setLoadedKey(requestKey);
        if (fiscalYear !== "all" && fiscalYear !== "latest" && !result.years.includes(Number(fiscalYear))) setFiscalYear("latest");
        if (result.page !== currentPage) setCurrentPage(result.page);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "โหลดเอกสารไม่สำเร็จ");
        setDocumentPage(null);
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [currentPage, debouncedSearch, categoryId, unitId, fiscalYear, refreshKey]);

  if (!hydrated || (loading && !documentPage && !loadError))
    return <PublicDocumentsSkeleton count={skeletonCount} />;

  const categoryCounts = documentPage?.categoryCounts ?? {};
  const yearTotal = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  const visibleCategories = categories.filter(
    (category) =>
      category.active &&
      ((categoryCounts[category.id] ?? 0) > 0 || category.id === categoryId),
  );
  const safeCategoryId =
    categoryId === "all" ||
    visibleCategories.some((category) => category.id === categoryId)
      ? categoryId
      : "all";
  const total = documentPage?.total ?? 0;
  const safePage = documentPage?.page ?? currentPage;
  const visibleDocuments = documentPage?.items ?? [];
  const selectedUnit = units.find((unit) => unit.id === unitId);

  function updateUrl(nextUnit: string, nextCategory: string, nextYear: string) {
    const url = new URL(window.location.href);
    if (nextUnit === "all") url.searchParams.delete("unit");
    else url.searchParams.set("unit", nextUnit);
    if (nextCategory === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", nextCategory);
    if (nextYear === "latest") url.searchParams.delete("year");
    else url.searchParams.set("year", nextYear);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }
  function changeUnit(nextUnit: string) {
    setCurrentPage(1);
    setUnitId(nextUnit);
    setCategoryId("all");
    setFiscalYear("latest");
    updateUrl(nextUnit, "all", "latest");
  }
  function changeCategory(nextCategory: string) {
    setCurrentPage(1);
    setCategoryId(nextCategory);
    updateUrl(unitId, nextCategory, fiscalYear);
  }

  function changeYear(nextYear: string) {
    setCurrentPage(1);
    setFiscalYear(nextYear);
    setCategoryId("all");
    updateUrl(unitId, "all", nextYear);
  }

  return (
    <div className="public-document-index">
      <header className="public-document-hero">
        <div>
          <p>ศูนย์รวมเอกสาร</p>
          <h1>
            {selectedUnit ? `เอกสาร — ${selectedUnit.name}` : "เอกสารดาวน์โหลด"}
          </h1>
          <span>ค้นหาแบบฟอร์ม คู่มือ รายงาน และเอกสารเผยแพร่ของโรงพยาบาล</span>
        </div>
      </header>
      <div className="public-document-content">
        <div className="public-list-filter-row">
          <label className="public-search-filter">
            <span>ค้นหา</span>
            <span className="public-list-search">
              <Search size={17} />
              <input
                value={search}
                maxLength={200}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อหรือเลขที่เอกสาร..."
              />
            </span>
          </label>
          <label className="public-document-filter">
            <span>หมวดหมู่</span>
            <NativeSelect
              value={safeCategoryId}
              onChange={(event) => changeCategory(event.target.value)}
            >
              <option value="all">ทุกหมวดหมู่ ({yearTotal})</option>
              {visibleCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name} ({categoryCounts[category.id] ?? 0})
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="public-document-filter">
            <span>ปีงบประมาณ</span>
            <NativeSelect value={fiscalYear} onChange={(event) => changeYear(event.target.value)} aria-label="กรองปีงบประมาณเอกสาร">
              <option value="latest">ปีล่าสุด{documentPage?.selectedYear ? ` (${documentPage.selectedYear})` : ""}</option>
              <option value="all">ทุกปีงบประมาณ</option>
              {(documentPage?.years ?? []).filter((year) => fiscalYear !== "latest" || year !== documentPage?.selectedYear).map((year) => <option key={year} value={year}>{year}</option>)}
            </NativeSelect>
          </label>
          <label className="public-owner-filter">
            <span>เจ้าของเอกสาร</span>
            <NativeSelect
              value={unitId}
              onChange={(event) => changeUnit(event.target.value)}
            >
              <option value="all">ทั้งหมด</option>
              <option value="hospital">โรงพยาบาล</option>
              {units.map((unit) => (
                <option value={unit.id} key={unit.id}>
                  {unit.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <div className="public-list-summary">
          <div>
            <span>รายการเอกสาร</span>
            <p>{showSkeleton ? "กำลังโหลดรายการเอกสาร..." : <><strong>{total}</strong> รายการ{selectedUnit ? ` จาก ${selectedUnit.name}` : ""}</>}</p>
          </div>
        </div>
        {showSkeleton ? <DocumentRowsSkeleton count={skeletonCount} /> : loadError ? <div className="public-news-index-empty" role="alert"><FileText size={30} /><h2>โหลดเอกสารไม่สำเร็จ</h2><p>{loadError}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></div> : total ? (
          <div className="unit-document-list document-block-list public-data-list-ready" key={loadedKey}>
            {visibleDocuments.map((document) => (
              <PublicDocumentRow
                key={document.id}
                document={document}
              />
            ))}
          </div>
        ) : (
          <div className="public-news-index-empty">
            <FileText size={30} />
            <h2>ไม่พบเอกสาร</h2>
            <p>ยังไม่มีเอกสารตรงกับกลุ่มงาน หมวดหมู่ หรือคำค้นหานี้</p>
            <button
              onClick={() => {
                setSearch("");
                changeCategory("all");
                changeYear("latest");
              }}
            >
              ล้างการค้นหา
            </button>
          </div>
        )}
        {!loading && !showSkeleton && !loadError ? <PublicPagination currentPage={safePage} totalItems={total} pageSize={pageSize} onPageChange={setCurrentPage} label="เปลี่ยนหน้ารายการเอกสาร" /> : null}
      </div>
    </div>
  );
}

export function PublicDocumentsSkeleton({ count }: { count: number }) {
  return (
    <div className="public-document-index public-document-index-skeleton" role="status" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดเอกสาร">
      <header className="public-document-hero">
        <div><p>ศูนย์รวมเอกสาร</p><h1>เอกสารดาวน์โหลด</h1><span>ค้นหาแบบฟอร์ม คู่มือ รายงาน และเอกสารเผยแพร่ของโรงพยาบาล</span></div>
      </header>
      <div className="public-document-content">
        <div className="public-list-filter-row">
          <label className="public-search-filter"><span>ค้นหา</span><span className="public-list-search"><Search size={17}/><input disabled placeholder="ค้นหาชื่อหรือเลขที่เอกสาร..."/></span></label>
          <label className="public-document-filter"><span>หมวดหมู่</span><NativeSelect disabled aria-label="หมวดหมู่"><option>ทุกหมวดหมู่</option></NativeSelect></label>
          <label className="public-document-filter"><span>ปีงบประมาณ</span><NativeSelect disabled aria-label="ปีงบประมาณ"><option>ปีล่าสุด</option></NativeSelect></label>
          <label className="public-owner-filter"><span>เจ้าของเอกสาร</span><NativeSelect disabled aria-label="เจ้าของเอกสาร"><option>ทั้งหมด</option></NativeSelect></label>
        </div>
        <div className="public-list-summary"><div><span>รายการเอกสาร</span><p>กำลังโหลดรายการเอกสาร...</p></div></div>
        <DocumentRowsSkeleton count={count}/>
      </div>
    </div>
  );
}

function DocumentRowsSkeleton({ count }: { count: number }) {
  return <ContentDataSkeleton kind="documents" count={count} immediate/>;
}
