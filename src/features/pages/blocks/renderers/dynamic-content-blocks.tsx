"use client";
import { PublicDocumentRow } from "@/features/documents/components/public-document-row";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { documentsChangeEvent, fetchPublicDocumentBlockPage, type PublicDocumentBlockPage } from "@/features/documents/demo/storage";
import { documentFileUrl } from "@/features/documents/document-file-name";
import { documentMedia } from "@/features/documents/document-media";
import { recordDocumentAccess } from "@/features/documents/record-document-access";
import { DocumentNewBadge } from "@/features/documents/components/document-new-badge";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { postsChangeEvent } from "@/features/news/demo/storage";
import type { PublicPostBlockPage } from "@/features/news/public-post-block-page";
import { NewsCoverImage } from "@/features/news/components/news-cover-image";
import { PublicNewsCard } from "@/features/news/components/public-news-card";
import type { BlockConfigMap } from "../config/types";
import { SecondaryRichText } from "./secondary-rich-text";
import { ContentDataSkeleton } from "./content-data-skeleton";

function documentPaginationItems(totalPages: number, currentPage: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const start = Math.max(2, Math.min(currentPage - 2, totalPages - 5));
  const visiblePages = [1, ...Array.from({ length: 5 }, (_, index) => start + index), totalPages];
  const items: Array<number | "ellipsis"> = [];
  for (const pageNumber of visiblePages) {
    const previous = items[items.length - 1];
    if (typeof previous === "number" && pageNumber - previous === 2) items.push(previous + 1);
    else if (typeof previous === "number" && pageNumber - previous > 2) items.push("ellipsis");
    items.push(pageNumber);
  }
  return items;
}

export function PostsContentBlock({
  config,
  initialPage,
}: {
  config: BlockConfigMap["posts"];
  initialPage?: PublicPostBlockPage;
}) {
  const [result, setResult] = useState<PublicPostBlockPage | null>(initialPage ?? null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState(initialPage ? JSON.stringify([config.source, config.categoryId, config.limit, 1, 0]) : "");
  const [loadError, setLoadError] = useState("");
  const requestKey = JSON.stringify([config.source, config.categoryId, config.limit, page, refreshKey]);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener(postsChangeEvent, refresh);
    return () => window.removeEventListener(postsChangeEvent, refresh);
  }, []);
  useEffect(() => {
    if (loadedKey === requestKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: String(config.limit), source: config.source.kind });
    if (config.source.kind === "unit") params.set("unit", config.source.unitId);
    if (config.categoryId) params.set("category", config.categoryId);
    void fetch(`/api/posts/block-list?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null || !("items" in payload) || !Array.isArray(payload.items) ||
          !("total" in payload) || typeof payload.total !== "number" || !("page" in payload) || typeof payload.page !== "number")
          throw new Error("โหลดข่าวไม่สำเร็จ");
        return payload as PublicPostBlockPage;
      })
      .then((next) => {
        if (controller.signal.aborted) return;
        setResult(next);
        setLoadedKey(JSON.stringify([config.source, config.categoryId, config.limit, next.page, refreshKey]));
        setLoadError("");
        if (next.page !== page) setPage(next.page);
      })
      .catch(() => {
        if (!controller.signal.aborted) { setLoadError("โหลดข่าวไม่สำเร็จ"); setLoadedKey(requestKey); }
      });
    return () => controller.abort();
  }, [config.source, config.categoryId, config.limit, page, refreshKey, requestKey, loadedKey]);
  const loading = loadedKey !== requestKey;

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / config.limit));
  const currentPage = result?.page ?? page;
  const items = result?.items ?? [];
  const pagination = totalPages > 1 ? (
    <nav className="document-block-pagination posts-block-pagination" aria-label="หน้าข่าวและผลงาน">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></button>
      {documentPaginationItems(totalPages, currentPage).map((item, index) => item === "ellipsis"
        ? <span aria-hidden="true" key={`ellipsis-${index}`}>…</span>
        : <button type="button" className={item === currentPage ? "active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => setPage(item)} key={item}>{item}</button>)}
      <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16}/></button>
    </nav>
  ) : null;
  return (
    <div className={`posts-content-block layout-${config.layout}`}>
      <header>
        <div className="tabbed-news-heading">
          <div>
            <h2>{config.title}</h2>
            {config.description ? (
              <SecondaryRichText value={config.description} />
            ) : null}
          </div>
        </div>
      </header>
      {loading ? <ContentDataSkeleton kind={config.layout === "grid" ? "news-grid" : "news-list"} count={config.limit}/> : items.length ? (
        <div
          className={
            config.layout === "grid"
              ? "public-news-index-grid public-news-list-grid posts-content-cards"
              : `tabbed-news-list posts-content-cards posts-content-list ${items.length < 4 ? "is-sparse" : ""}`
          }
        >
          {items.map((post) => {
            const coverUrl = post.coverImageUrl;
            const coverStyle = coverUrl
              ? undefined
              : { backgroundImage: "url(/hospital-logo.png)" };
            return config.layout === "grid" ? (
              <PublicNewsCard key={post.id} post={post} showExcerpt />
            ) : (
              <Link href={`/news/${post.slug}`} key={post.id}>
                <span
                  className={`tabbed-news-cover news-cover-viewport ${coverUrl ? "" : "fallback-logo"}`}
                  style={
                    coverStyle
                  }
                  role="img"
                  aria-label={`ภาพประกอบ ${post.title}`}
                >{coverUrl ? <NewsCoverImage post={post} src={coverUrl} /> : null}</span>
                <div>
                  <h3>{post.title}</h3>
                  {post.excerpt.trim() ? (
                    <p className="posts-list-excerpt">{post.excerpt}</p>
                  ) : null}
                  <time>
                    <CalendarDays size={12} aria-hidden="true" />
                    {post.publishedAt ?? "ยังไม่ระบุวันที่"}
                    {post.isNew ? <span className="news-new-badge news-new-badge-inline">ใหม่</span> : null}
                  </time>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="block-placeholder">ยังไม่มีข่าวที่เผยแพร่ในหมวดนี้</p>
      )}
      {pagination}
      {loadError ? <p role="alert">{loadError} <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></p> : null}
    </div>
  );
}

export function DocumentsContentBlock({
  config,
  initialPage,
}: {
  config: BlockConfigMap["documents"];
  initialPage?: PublicDocumentBlockPage;
}) {
  const firstTab = config.tabs[0];
  const initialContextKey = JSON.stringify([firstTab?.id, firstTab?.source, firstTab?.categoryId, firstTab?.fiscalYear, config.limit]);
  const initialRequestKey = JSON.stringify([initialContextKey, 1, 0]);
  const [result, setResult] = useState<PublicDocumentBlockPage | null>(initialPage ?? null);
  const [resultTabId, setResultTabId] = useState(initialPage ? firstTab?.id ?? "" : "");
  const [loadError, setLoadError] = useState("");
  const [loadedKey, setLoadedKey] = useState(initialPage ? initialRequestKey : "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeId, setActiveId] = useState(config.tabs[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const activeTab = config.tabs.find((tab) => tab.id === activeId) ?? config.tabs[0];
  const contextKey = JSON.stringify([activeTab?.id, activeTab?.source, activeTab?.categoryId, activeTab?.fiscalYear, config.limit]);
  const requestKey = JSON.stringify([contextKey, page, refreshKey]);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabScroll, setTabScroll] = useState({
    overflow: false,
    left: false,
    right: false,
  });
  const updateTabScroll = useCallback(() => {
    const element = tabsRef.current;
    if (!element) return;
    const overflow = element.scrollWidth > element.clientWidth + 1;
    setTabScroll({
      overflow,
      left: overflow && element.scrollLeft > 1,
      right:
        overflow &&
        element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    });
  }, []);
  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    window.addEventListener(documentsChangeEvent, refresh);
    return () => window.removeEventListener(documentsChangeEvent, refresh);
  }, []);
  useEffect(() => {
    if (!activeTab || loadedKey === requestKey) return;
    const controller = new AbortController();
    void fetchPublicDocumentBlockPage({ page, limit: config.limit, tab: activeTab }, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setResult(next);
        setResultTabId(activeTab.id);
        setLoadError("");
        setLoadedKey(JSON.stringify([contextKey, next.page, refreshKey]));
        if (next.page !== page) setPage(next.page);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "โหลดเอกสารไม่สำเร็จ");
        setLoadedKey(requestKey);
      });
    return () => controller.abort();
  }, [activeTab, config.limit, contextKey, loadedKey, page, refreshKey, requestKey]);
  useEffect(() => {
    const element = tabsRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateTabScroll);
    observer.observe(element);
    updateTabScroll();
    return () => observer.disconnect();
  }, [config.tabs.length, updateTabScroll]);
  const scrollTabs = (direction: -1 | 1) => {
    const element = tabsRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(180, element.clientWidth * 0.65),
      behavior: "smooth",
    });
  };
  const isLoading = loadedKey !== requestKey;
  if (!activeTab) return <div className="document-block-empty" role="alert"><p>ยังไม่มีแท็บเอกสารสำหรับบล็อกนี้</p></div>;

  if (loadError && !result) return <div className="document-block-empty" role="alert"><p>{loadError}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></div>;
  const activeResult = resultTabId === activeTab.id ? result : null;
  const totalPages = Math.max(1, Math.ceil((activeResult?.total ?? 0) / config.limit));
  const currentPage = activeResult?.page ?? page;
  const items = activeResult?.items ?? [];
  const retryNotice = loadError && !isLoading ? <div className="document-block-empty" role="alert"><p>{loadError}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>ลองอีกครั้ง</button></div> : null;
  const pagination = totalPages > 1 ? (
    <nav className="document-block-pagination" aria-label="หน้าเอกสาร">
      <button type="button" disabled={isLoading || currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16} /></button>
      {documentPaginationItems(totalPages, currentPage).map((item, index) => item === "ellipsis"
        ? <span className="document-block-pagination-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>…</span>
        : <button type="button" disabled={isLoading} className={`document-block-pagination-page${item === currentPage ? " active" : ""}${Math.abs(item - currentPage) > 1 ? " is-distant" : ""}`} aria-current={item === currentPage ? "page" : undefined} onClick={() => setPage(item)} key={item}>{item}</button>
      )}
      <button type="button" disabled={isLoading || currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16} /></button>
    </nav>
  ) : null;
  return (
    <section className="tabbed-documents-block">
      <header>
        <div>
          <h2>{config.title}</h2>
          {config.description ? (
            <SecondaryRichText value={config.description} />
          ) : null}
        </div>
        <Link className="tabbed-documents-view-all-top" href="/documents">ดูเอกสารทั้งหมด <ArrowRight size={15} aria-hidden /></Link>
      </header>
      {config.tabs.length > 1 ? (
        <div className={`document-tabs-shell${tabScroll.overflow ? " has-overflow" : ""}${tabScroll.left ? " can-scroll-left" : ""}${tabScroll.right ? " can-scroll-right" : ""}`}>
          {tabScroll.overflow ? (
            <div className="block-tabs-controls" aria-label="เลื่อนแท็บเอกสาร">
              <button
                type="button"
                className="tabbed-news-tabs-arrow is-left"
                aria-label="เลื่อนแท็บไปทางซ้าย"
                disabled={!tabScroll.left}
                onClick={() => scrollTabs(-1)}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="tabbed-news-tabs-arrow is-right"
                aria-label="เลื่อนแท็บไปทางขวา"
                disabled={!tabScroll.right}
                onClick={() => scrollTabs(1)}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          ) : null}
          <div
            ref={tabsRef}
            className="unit-document-tabs document-block-tabs"
            role="tablist"
            aria-label={config.title}
            onScroll={updateTabScroll}
          >
            {config.tabs.map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab.id}
                className={tab.id === activeTab.id ? "active" : ""}
                key={tab.id}
                onClick={(event) => {
                  setActiveId(tab.id);
                  setPage(1);
                  event.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {isLoading ? <ContentDataSkeleton kind={config.layout === "table" ? "table" : "documents"} count={activeResult ? Math.min(config.limit, Math.max(0, activeResult.total - (page - 1) * config.limit)) : config.limit} footer={pagination}/> : config.layout === "table" ? (
        items.length ? (
          <div className="document-block-table-shell" role="tabpanel">
            <div className="document-block-table-wrap">
              <table className="document-block-table">
            <thead>
              <tr>
                <th>เอกสาร</th>
                <th className="document-block-table-date">วันที่เผยแพร่</th>
                <th className="document-block-table-downloads">ดาวน์โหลด</th>
                <th aria-label="เปิดไฟล์" />
              </tr>
            </thead>
            <tbody>
              {items.map((document) => {
                const media = documentMedia(document);
                const title = (
                  <span className="document-block-table-title">
                    <DocumentFileIcon file={media} />
                    <strong>{document.title}</strong>
                    <DocumentNewBadge isNew={document.isNew}/>
                  </span>
                );
                return (
                  <tr key={document.id}>
                    <td>
                      {media ? (
                        <DocumentFileLink media={media} href={documentFileUrl(document.id, document.title, media.mimeType)}>{title}</DocumentFileLink>
                      ) : (
                        <Link href="/documents">{title}</Link>
                      )}
                    </td>
                    <td className="document-block-table-date">
                      <span><CalendarDays size={14} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
                    </td>
                    <td className="document-block-table-downloads">
                      {document.downloadCount.toLocaleString("th-TH")} ครั้ง
                    </td>
                    <td>
                      {media ? (
                        <a
                          className="document-block-table-action"
                          href={documentFileUrl(document.id, document.title, media.mimeType, "download")}
                          aria-label={`ดาวน์โหลด ${document.title}`}
                          title={`ดาวน์โหลด ${document.title}`}
                          onClick={() => recordDocumentAccess(document.id, "download")}
                        >
                          <Download aria-hidden="true" size={18} />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            </div>
            {pagination}
            {retryNotice}
          </div>
        ) : (
          <div className="document-block-empty" role="tabpanel">
            <p>{isLoading ? "กำลังโหลดเอกสาร" : "ยังไม่มีเอกสารเผยแพร่ในแท็บนี้"}</p>
            {retryNotice}
          </div>
        )
      ) : (
      <div className="unit-document-list document-block-list" role="tabpanel">
        {items.length ? (
          items.map((document) => <PublicDocumentRow key={document.id} document={document}/>)
        ) : (
          <div className="document-block-empty">
            <p>{isLoading ? "กำลังโหลดเอกสาร" : "ยังไม่มีเอกสารเผยแพร่ในแท็บนี้"}</p>
          </div>
        )}
        {pagination}
        {retryNotice}
      </div>
      )}
      <div className="tabbed-news-view-all tabbed-documents-view-all-bottom">
        <Link href="/documents">ดูเอกสารทั้งหมด <ArrowRight size={15} aria-hidden /></Link>
      </div>
    </section>
  );
}
