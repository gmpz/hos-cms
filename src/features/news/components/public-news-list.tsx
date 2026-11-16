"use client";

import { Search } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useRef, useState } from "react";
import { PublicPagination } from "@/components/public/public-pagination";
import { PublicIndexHero } from "@/components/public/public-index-hero";
import {
  categoriesChangedEvent,
  readCategories,
} from "@/features/categories/demo/storage";
import type { DemoUnit } from "@/features/units/demo/model";
import { readUnits } from "@/features/units/demo/storage";
import { postsChangeEvent } from "../demo/storage";
import { fetchPostListPage, type PostListPage } from "../list-page";
import { PublicNewsCard } from "./public-news-card";

const pageSize = 12;
const skeletonDelayMs = 180;
const skeletonMinimumMs = 320;

export function PublicNewsList({
  initialUnit = "all",
  initialCategory = "all",
  initialYear = "latest",
  initialPage = null,
}: {
  initialUnit?: string;
  initialCategory?: string;
  initialYear?: string;
  initialPage?: PostListPage | null;
}) {
  const [postPage, setPostPage] = useState<PostListPage | null>(initialPage);
  const [loadedKey, setLoadedKey] = useState(() => initialPage ? JSON.stringify([1, "", initialUnit, initialCategory, initialYear, 0]) : "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [units, setUnits] = useState<DemoUnit[]>([]);
  const [categories, setCategories] = useState(() => readCategories("posts"));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unitId, setUnitId] = useState(initialUnit);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [year, setYear] = useState(initialYear);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonStartedAt = useRef<number | null>(null);
  const queryKey = JSON.stringify([currentPage, debouncedSearch, unitId, categoryId, year, refreshKey]);
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    const timers: number[] = [];
    if (loading) {
      skeletonStartedAt.current = null;
      timers.push(window.setTimeout(() => setShowSkeleton(false), 0));
      timers.push(window.setTimeout(() => {
        skeletonStartedAt.current = performance.now();
        setShowSkeleton(true);
      }, skeletonDelayMs));
    } else if (skeletonStartedAt.current !== null) {
      const visibleFor = performance.now() - skeletonStartedAt.current;
      timers.push(window.setTimeout(() => {
        skeletonStartedAt.current = null;
        setShowSkeleton(false);
      }, Math.max(0, skeletonMinimumMs - visibleFor)));
    } else {
      timers.push(window.setTimeout(() => setShowSkeleton(false), 0));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [loading]);

  useEffect(() => {
    const refresh = () => {
      setUnits(readUnits().filter((unit) => unit.status === "published"));
      setCategories(readCategories("posts"));
    };
    refresh();
    const reload = () => setRefreshKey((value) => value + 1);
    window.addEventListener(postsChangeEvent, reload);
    window.addEventListener("hos-units-change", refresh);
    window.addEventListener(categoriesChangedEvent, refresh);
    return () => {
      window.removeEventListener(postsChangeEvent, reload);
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
    const requestKey = JSON.stringify([currentPage, debouncedSearch, unitId, categoryId, year, refreshKey]);
    void fetchPostListPage("public", { page: currentPage, search: debouncedSearch, unit: unitId, category: categoryId, year }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setPostPage(result);
        setLoadedKey(requestKey);
        setLoadError("");
        if (year !== "all" && year !== "latest" && !result.years.includes(Number(year))) setYear("latest");
        if (result.page !== currentPage) setCurrentPage(result.page);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "โหลดข่าวไม่สำเร็จ");
        setPostPage(null);
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [currentPage, debouncedSearch, unitId, categoryId, year, refreshKey]);

  if (loading && !postPage && !loadError)
    return <PublicNewsSkeleton showCards={showSkeleton} />;

  const categoryCounts = postPage?.categoryCounts ?? {};
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
  const total = postPage?.total ?? 0;
  const safePage = postPage?.page ?? 1;
  const visiblePosts = postPage?.items ?? [];
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
    updateUrl(nextUnit, "all", "latest");
    setYear("latest");
  }
  function changeCategory(nextCategory: string) {
    setCurrentPage(1);
    setCategoryId(nextCategory);
    updateUrl(unitId, nextCategory, year);
  }

  return (
    <div className="public-news-index">
      <PublicIndexHero
        eyebrow="ข่าวสารโรงพยาบาล"
        title={selectedUnit ? `ข่าวและผลงาน — ${selectedUnit.name}` : "ข่าวและผลงาน"}
        description="ติดตามข่าวประชาสัมพันธ์ กิจกรรม และผลงานจากโรงพยาบาลและกลุ่มงานต่าง ๆ"
      />
      <div className="public-news-index-content">
        <div className="public-list-filter-row">
          <label className="public-search-filter">
            <span>ค้นหา</span>
            <span className="public-list-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาข่าว..."
              />
            </span>
          </label>
          <label className="public-document-filter">
            <span>หมวดหมู่</span>
            <NativeSelect value={safeCategoryId} onChange={(event) => changeCategory(event.target.value)}>
              <option value="all">ทุกหมวดหมู่ ({yearTotal})</option>
              {visibleCategories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name} ({categoryCounts[category.id] ?? 0})
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="public-owner-filter">
            <span>ปีที่เผยแพร่</span>
            <NativeSelect value={year} onChange={(event) => { setYear(event.target.value); setCategoryId("all"); setCurrentPage(1); updateUrl(unitId, "all", event.target.value); }}>
              <option value="latest">{postPage?.selectedYear ? `ปีล่าสุด (${postPage.selectedYear})` : "ปีล่าสุดที่มีข่าว"}</option>
              <option value="all">ทุกปี</option>
              {(postPage?.years ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
            </NativeSelect>
          </label>
          <label className="public-owner-filter">
            <span>เจ้าของเนื้อหา</span>
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
        <div className="public-news-index-summary">
          <strong>{total}</strong> รายการ
          {selectedUnit ? ` จาก ${selectedUnit.name}` : ""}
        </div>
        {showSkeleton ? <NewsCardSkeletonGrid /> : loadError ? <div className="public-news-index-empty" role="alert"><Search size={30} /><h2>โหลดข่าวไม่สำเร็จ</h2><p>{loadError}</p><button onClick={() => setRefreshKey((value) => value + 1)}>ลองใหม่</button></div> : total ? (
          <div className="public-news-index-grid public-news-list-grid news-card-grid-ready" key={loadedKey}>
            {visiblePosts.map((post) => (
              <PublicNewsCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="public-news-index-empty">
            <Search size={30} />
            <h2>ไม่พบข่าว</h2>
            <p>ยังไม่มีข่าวตรงกับกลุ่มงาน หมวดหมู่ หรือคำค้นหานี้</p>
            <button
              onClick={() => {
                setSearch("");
                changeCategory("all");
              }}
            >
              ล้างการค้นหา
            </button>
          </div>
        )}
        {!loading && !showSkeleton && !loadError ? <PublicPagination currentPage={safePage} totalItems={total} pageSize={pageSize} onPageChange={setCurrentPage} label="เปลี่ยนหน้ารายการข่าว" /> : null}
      </div>
    </div>
  );
}

function PublicNewsSkeleton({ showCards }: { showCards: boolean }) {
  return (
    <div className="public-news-index public-news-index-skeleton" role="status" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดข่าวสาร">
      <PublicIndexHero
        eyebrow="ข่าวสารโรงพยาบาล"
        title="ข่าวและผลงาน"
        description="ติดตามข่าวประชาสัมพันธ์ กิจกรรม และผลงานจากโรงพยาบาลและกลุ่มงานต่าง ๆ"
      />
      <div className="public-news-index-content">
        <div className="public-list-filter-row">
          <label className="public-search-filter"><span>ค้นหา</span><span className="public-list-search"><Search size={17} /><input disabled placeholder="ค้นหาข่าว..." /></span></label>
          <label className="public-document-filter"><span>หมวดหมู่</span><NativeSelect disabled aria-label="หมวดหมู่"><option>ทุกหมวดหมู่</option></NativeSelect></label>
          <label className="public-owner-filter"><span>ปีที่เผยแพร่</span><NativeSelect disabled aria-label="ปีที่เผยแพร่"><option>ปีล่าสุด</option></NativeSelect></label>
          <label className="public-owner-filter"><span>เจ้าของเนื้อหา</span><NativeSelect disabled aria-label="เจ้าของเนื้อหา"><option>ทั้งหมด</option></NativeSelect></label>
        </div>
        <div className="public-news-index-summary">กำลังโหลดรายการข่าว...</div>
        {showCards ? <NewsCardSkeletonGrid announce={false} /> : <div className="news-card-skeleton-delay" aria-hidden="true" />}
      </div>
    </div>
  );
}

function NewsCardSkeletonGrid({ announce = true }: { announce?: boolean }) {
  return (
    <div className="public-news-index-grid public-news-list-grid news-card-skeleton-grid" role={announce ? "status" : undefined} aria-label={announce ? "กำลังโหลดรายการข่าว" : undefined}>
      {Array.from({ length: 8 }, (_, index) => (
        <article className="news-card-skeleton" aria-hidden="true" key={index}>
          <span className="news-skeleton-block news-card-skeleton-cover" />
          <div>
            <span className="news-skeleton-block news-card-skeleton-title" />
            <span className="news-skeleton-block news-card-skeleton-title short" />
            <span className="news-skeleton-block news-card-skeleton-date" />
          </div>
        </article>
      ))}
    </div>
  );
}

