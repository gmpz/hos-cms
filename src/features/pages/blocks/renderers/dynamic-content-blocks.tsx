"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { publicDocumentsAreLoaded, readDocuments, refreshDocuments } from "@/features/documents/demo/storage";
import type { DemoDocument } from "@/features/documents/demo/model";
import { documentFileUrl } from "@/features/documents/document-file-name";
import { recordDocumentAccess } from "@/features/documents/record-document-access";
import { useMediaRevision } from "@/features/media/use-media-revision";
import {
  getDemoMediaItem,
} from "@/features/media/demo/media-registry";
import { isPdfFile } from "@/features/media/file-behavior";
import { DocumentFileIcon } from "@/features/media/components/document-file-icon";
import { DocumentFileLink } from "@/features/media/components/document-file-link";
import { publicPostsAreLoaded, readPosts, refreshPosts } from "@/features/news/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";
import { NewsCoverImage } from "@/features/news/components/news-cover-image";
import { PublicNewsCard } from "@/features/news/components/public-news-card";
import type { BlockConfigMap } from "../config/types";
import { SecondaryRichText } from "./secondary-rich-text";
import { DynamicBlockSkeleton } from "./dynamic-block-skeleton";

export function PostsContentBlock({
  config,
}: {
  config: BlockConfigMap["posts"];
}) {
  useMediaRevision();
  const [posts, setPosts] = useState<DemoPost[]>(() => readPosts());
  const [loading, setLoading] = useState(() => !publicPostsAreLoaded());
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      setPosts(readPosts());
    };
    void refreshPosts().then((items) => {
      if (active) setPosts(items);
    }).catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    window.addEventListener("hos-posts-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("hos-posts-change", refresh);
    };
  }, []);
  useEffect(() => {
    setPage(1);
  }, [config.categoryId, config.limit, config.layout, config.source.kind, config.source.kind === "unit" ? config.source.unitId : null]);
  if (loading) return <DynamicBlockSkeleton layout={config.layout === "grid" ? "cards" : "rows"} items={config.limit} label="กำลังโหลดข่าวภายในบล็อก" />;
  const filteredItems = posts.filter(
      (post) =>
        post.status === "published" &&
        (!config.categoryId || post.categoryId === config.categoryId) &&
        (config.source.kind === "all" ||
          (config.source.kind === "hospital"
            ? post.unitId === null
            : post.unitId === config.source.unitId)),
    );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / config.limit));
  const currentPage = Math.min(page, totalPages);
  const items = filteredItems.slice(
    (currentPage - 1) * config.limit,
    currentPage * config.limit,
  );
  const pagination = totalPages > 1 ? (
    <nav className="document-block-pagination posts-block-pagination" aria-label="หน้าข่าวและผลงาน">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16}/></button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <button type="button" className={pageNumber === currentPage ? "active" : ""} aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>
      ))}
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
      {items.length ? (
        <div
          className={
            config.layout === "grid"
              ? "public-news-index-grid public-news-list-grid posts-content-cards"
              : `tabbed-news-list posts-content-cards posts-content-list ${items.length < 4 ? "is-sparse" : ""}`
          }
        >
          {items.map((post) => {
            const cover = getDemoMediaItem(post.coverMediaId);
            const coverStyle = cover
              ? undefined
              : { backgroundImage: "url(/hospital-logo.png)" };
            return config.layout === "grid" ? (
              <PublicNewsCard key={post.id} post={post} />
            ) : (
              <Link href={`/news/${post.slug}`} key={post.id}>
                <span
                  className={`tabbed-news-cover news-cover-viewport ${cover ? "" : "fallback-logo"}`}
                  style={
                    coverStyle
                  }
                  role="img"
                  aria-label={`ภาพประกอบ ${post.title}`}
                >{cover ? <NewsCoverImage post={post} media={cover} /> : null}</span>
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
    </div>
  );
}

export function DocumentsContentBlock({
  config,
}: {
  config: BlockConfigMap["documents"];
}) {
  useMediaRevision();
  const [documents, setDocuments] = useState<DemoDocument[]>(() => readDocuments());
  const [loading, setLoading] = useState(() => !publicDocumentsAreLoaded());
  const [activeId, setActiveId] = useState(config.tabs[0]?.id ?? "");
  const [page, setPage] = useState(1);
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
    let active = true;
    const refresh = () => {
      setDocuments(readDocuments());
    };
    void refreshDocuments().then((items) => {
      if (active) setDocuments(items);
    }).catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    window.addEventListener("hos-documents-change", refresh);
    return () => {
      active = false;
      window.removeEventListener("hos-documents-change", refresh);
    };
  }, []);
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
  if (loading) return <DynamicBlockSkeleton layout={config.layout === "cards" ? "cards" : "rows"} tabs={config.tabs.length} items={config.limit} label="กำลังโหลดเอกสารภายในบล็อก" />;
  const activeTab =
    config.tabs.find((tab) => tab.id === activeId) ?? config.tabs[0];
  const filteredItems = documents.filter(
      (document) =>
        document.status === "published" &&
        (!activeTab ||
          activeTab.source.kind === "all" ||
          (activeTab.source.kind === "hospital" && document.unitId === null) ||
          (activeTab.source.kind === "unit" && document.unitId === activeTab.source.unitId) ||
          (activeTab.source.kind === "selected" && activeTab.source.documentIds.includes(document.id))) &&
        (!activeTab?.categoryId || document.categoryId === activeTab.categoryId),
    );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / config.limit));
  const currentPage = Math.min(page, totalPages);
  const items = filteredItems.slice(
    (currentPage - 1) * config.limit,
    currentPage * config.limit,
  );
  const pagination = totalPages > 1 ? (
    <nav className="document-block-pagination" aria-label="หน้าเอกสาร">
      <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า"><ChevronLeft size={16} /></button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <button type="button" className={pageNumber === currentPage ? "active" : ""} aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)} key={pageNumber}>{pageNumber}</button>
      ))}
      <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป"><ChevronRight size={16} /></button>
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
          {tabScroll.left ? (
            <button
              type="button"
              className="tabbed-news-tabs-arrow is-left"
              aria-label="เลื่อนแท็บไปทางซ้าย"
              onClick={() => scrollTabs(-1)}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
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
                aria-selected={tab.id === activeTab?.id}
                className={tab.id === activeTab?.id ? "active" : ""}
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
          {tabScroll.right ? (
            <button
              type="button"
              className="tabbed-news-tabs-arrow is-right"
              aria-label="เลื่อนแท็บไปทางขวา"
              onClick={() => scrollTabs(1)}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
      {config.layout === "table" ? (
        items.length ? (
          <div className="document-block-table-wrap" role="tabpanel">
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
                const media = getDemoMediaItem(document.mediaIds[0] ?? null);
                const title = (
                  <span className="document-block-table-title">
                    <DocumentFileIcon file={media} />
                    <strong>{document.title}</strong>
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
            {pagination}
          </div>
        ) : (
          <div className="document-block-empty" role="tabpanel">
            <p>ยังไม่มีเอกสารเผยแพร่ในแท็บนี้</p>
          </div>
        )
      ) : (
      <div className="unit-document-list document-block-list" role="tabpanel">
        {items.length ? (
          items.map((document) => {
            const media = getDemoMediaItem(document.mediaIds[0] ?? null);
            if (media && isPdfFile(media)) {
              return (
                <div className="unit-document-row-with-download" key={document.id}>
                  <DocumentFileLink className="unit-document-open" media={media} href={documentFileUrl(document.id, document.title, media.mimeType)}>
                    <DocumentFileIcon file={media} size={19} />
                    <span>
                      <strong>{document.title}</strong>
                      <small className="document-block-card-meta">
                        <span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
                        <span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span>
                      </small>
                    </span>
                  </DocumentFileLink>
                  <a className="public-document-action public-document-download" href={documentFileUrl(document.id, document.title, media.mimeType, "download")} aria-label={`ดาวน์โหลด PDF ${document.title}`} title="ดาวน์โหลด PDF" onClick={() => recordDocumentAccess(document.id, "download")}><Download size={16}/><span>{media.size}</span></a>
                </div>
              );
            }
            const content = (
              <>
                <DocumentFileIcon file={media} size={19} />
                <span>
                  <strong>{document.title}</strong>
                  <small className="document-block-card-meta">
                    <span><CalendarDays size={12} aria-hidden="true" />{document.publishedAt ?? "ไม่ระบุวันที่"}</span>
                    <span aria-label={`ดาวน์โหลด ${document.downloadCount.toLocaleString("th-TH")} ครั้ง`}><Download size={12} aria-hidden="true" />{document.downloadCount.toLocaleString("th-TH")} ครั้ง</span>
                  </small>
                </span>
                {media ? <span className="public-document-action public-document-download unit-document-download-indicator" title="ดาวน์โหลดไฟล์"><Download size={16} aria-hidden="true"/><span>{media.size}</span></span> : <b className="public-document-action">{document.mediaIds.length} ไฟล์</b>}
              </>
            );
            if (!media) {
              return (
                <div key={document.id}>
                  {content}
                </div>
              );
            }
            return (
              <DocumentFileLink media={media} href={documentFileUrl(document.id, document.title, media.mimeType)} key={document.id}>
                {content}
              </DocumentFileLink>
            );
          })
        ) : (
          <div className="document-block-empty">
            <p>ยังไม่มีเอกสารเผยแพร่ในแท็บนี้</p>
          </div>
        )}
        {pagination}
      </div>
      )}
      <div className="tabbed-news-view-all tabbed-documents-view-all-bottom">
        <Link href="/documents">ดูเอกสารทั้งหมด <ArrowRight size={15} aria-hidden /></Link>
      </div>
    </section>
  );
}
