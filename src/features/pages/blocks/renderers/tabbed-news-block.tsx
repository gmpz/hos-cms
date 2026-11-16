"use client";

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoriesChangedEvent,
  categoryName,
  readCategories,
} from "@/features/categories/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";
import { NewsCoverImage } from "@/features/news/components/news-cover-image";
import type { BlockConfigMap } from "../config/types";
import { DynamicBlockSkeleton } from "./dynamic-block-skeleton";

const emptyPosts: DemoPost[] = [];

export function TabbedNewsBlock({
  config,
  initialPosts,
}: {
  config: BlockConfigMap["newsTabs"];
  initialPosts?: DemoPost[];
}) {
  const [activeId, setActiveId] = useState(config.tabs[0]?.id ?? "");
  const firstTab = config.tabs[0];
  const firstKey = firstTab ? JSON.stringify([firstTab.source, firstTab.categoryId]) : "";
  const [postsByTab, setPostsByTab] = useState<Record<string, DemoPost[]>>(() =>
    firstTab && initialPosts ? { [firstKey]: initialPosts } : {});
  const [failedKey, setFailedKey] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [categories, setCategories] = useState(() => readCategories("posts"));
  const activeTab = config.tabs.find((tab) => tab.id === activeId) ?? firstTab;
  const activeKey = activeTab ? JSON.stringify([activeTab.source, activeTab.categoryId]) : "";
  const items = activeTab ? postsByTab[activeKey] : emptyPosts;
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
    const refresh = () => setCategories(readCategories("posts"));
    window.addEventListener(categoriesChangedEvent, refresh);
    return () => {
      window.removeEventListener(categoriesChangedEvent, refresh);
    };
  }, []);
  useEffect(() => {
    if (!activeTab || items !== undefined || failedKey === activeKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ source: activeTab.source.kind });
    if (activeTab.source.kind === "unit") params.set("unit", activeTab.source.unitId);
    if (activeTab.categoryId) params.set("category", activeTab.categoryId);
    void fetch(`/api/posts/block-tab?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("โหลดข่าวไม่สำเร็จ");
        const payload: unknown = await response.json();
        if (!Array.isArray(payload) || !payload.every((post) =>
          typeof post === "object" && post !== null && typeof post.id === "string" &&
          typeof post.slug === "string" && typeof post.title === "string"))
          throw new Error("ข้อมูลข่าวไม่ถูกต้อง");
        return payload as DemoPost[];
      })
      .then((posts) => {
        if (!controller.signal.aborted) setPostsByTab((previous) => ({ ...previous, [activeKey]: posts }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailedKey(activeKey);
      });
    return () => controller.abort();
  }, [activeKey, activeTab, failedKey, items, retryCount]);
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
  if (items === undefined && activeId === firstTab?.id && failedKey !== activeKey)
    return <DynamicBlockSkeleton layout="cards" tabs={config.tabs.length} items={4} label="กำลังโหลดแท็บข่าว" />;
  return (
    <section className="tabbed-news-block">
      <header>
        <div className="tabbed-news-heading">
          <div>
            <h2>{config.title}</h2>
            {config.description ? (
              <p>{config.description}</p>
            ) : null}
          </div>
        </div>
        <Link className="tabbed-news-view-all-top" href="/news">
          ดูข่าวทั้งหมด <ArrowRight size={15} aria-hidden />
        </Link>
      </header>
      <div
        className={`tabbed-news-tabs-shell${tabScroll.overflow ? " has-overflow" : ""}${tabScroll.left ? " can-scroll-left" : ""}${tabScroll.right ? " can-scroll-right" : ""}`}
      >
        {tabScroll.overflow ? (
          <div className="block-tabs-controls" aria-label="เลื่อนแท็บข่าว">
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
          className="tabbed-news-tabs"
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
      {items === undefined && failedKey !== activeKey ? (
        <div className="tabbed-news-empty" role="status" aria-live="polite">กำลังโหลดข่าว...</div>
      ) : failedKey === activeKey ? (
        <div className="tabbed-news-empty" role="tabpanel">
          <strong>โหลดข่าวไม่สำเร็จ</strong>
          <button type="button" onClick={() => { setFailedKey(""); setRetryCount((count) => count + 1); }}>ลองอีกครั้ง</button>
        </div>
      ) : items?.length ? (
        <div className="tabbed-news-content" role="tabpanel">
          <Link
            className="tabbed-news-featured"
            href={`/news/${items[0].slug}`}
          >
            <NewsCover
              post={items[0]}
              title={items[0].title}
              show={config.showImage}
            />
            {items[0].isNew ? <span className="news-new-badge">ใหม่</span> : null}
            <div
              className={
                config.showDescription && items[0].excerpt
                  ? undefined
                  : "without-description"
              }
            >
              <small>{categoryName(categories, items[0].categoryId)}</small>
              <h3>{items[0].title}</h3>
              {config.showDescription ? <p>{items[0].excerpt}</p> : null}
              <time>
                <CalendarDays size={12} />
                {items[0].publishedAt}
              </time>
            </div>
          </Link>
          <div
            className={`tabbed-news-list ${items.length < 4 ? "is-sparse" : ""}`}
          >
            {items.slice(1, 4).map((post) => (
              <Link href={`/news/${post.slug}`} key={post.id}>
                <NewsCover
                  post={post}
                  title={post.title}
                  show={config.showImage}
                />
                <div>
                  <small>{categoryName(categories, post.categoryId)}</small>
                  <h3>{post.title}</h3>
                  <time>
                    <CalendarDays size={12} />
                    {post.publishedAt}
                    {post.isNew ? <span className="news-new-badge news-new-badge-inline">ใหม่</span> : null}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="tabbed-news-empty" role="tabpanel">
          <strong>ไม่พบข่าว</strong>
          <p>ยังไม่มีข่าวที่เผยแพร่ในหมวดนี้</p>
        </div>
      )}
      <div className="tabbed-news-view-all tabbed-news-view-all-bottom">
        <Link href="/news">
          ดูข่าวทั้งหมด <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function NewsCover({
  post,
  title,
  show,
}: {
  post: DemoPost;
  title: string;
  show: boolean;
}) {
  if (!show) return null;
  const coverUrl = post.coverImageUrl;
  return (
    <span
      className={`tabbed-news-cover news-cover-viewport ${coverUrl ? "" : "fallback-logo"}`}
      style={
        coverUrl
          ? undefined
          : { backgroundImage: "url(/hospital-logo.png)" }
      }
      role="img"
      aria-label={`ภาพประกอบ ${title}`}
    >{coverUrl ? <NewsCoverImage post={post} src={coverUrl} /> : null}</span>
  );
}
