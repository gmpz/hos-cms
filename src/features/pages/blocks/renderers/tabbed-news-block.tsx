"use client";

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoriesChangedEvent,
  categoryName,
  readCategories,
} from "@/features/categories/demo/storage";
import {
  getDemoMediaItem,
} from "@/features/media/demo/media-registry";
import { publicPostsAreLoaded, readPosts, refreshPosts } from "@/features/news/demo/storage";
import type { DemoPost } from "@/features/pages/demo/data";
import { NewsCoverImage } from "@/features/news/components/news-cover-image";
import type { BlockConfigMap } from "../config/types";
import { DynamicBlockSkeleton } from "./dynamic-block-skeleton";

export function TabbedNewsBlock({
  config,
}: {
  config: BlockConfigMap["newsTabs"];
}) {
  const [activeId, setActiveId] = useState(config.tabs[0]?.id ?? "");
  const [posts, setPosts] = useState<DemoPost[]>(() => readPosts());
  const [loading, setLoading] = useState(() => !publicPostsAreLoaded());
  const [categories, setCategories] = useState(() => readCategories("posts"));
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
      setPosts(readPosts());
      setCategories(readCategories("posts"));
    };
    void refreshPosts().then((items) => {
      if (active) setPosts(items);
    }).catch(() => undefined).finally(() => {
      if (active) setLoading(false);
    });
    window.addEventListener("hos-posts-change", refresh);
    window.addEventListener(categoriesChangedEvent, refresh);
    return () => {
      active = false;
      window.removeEventListener("hos-posts-change", refresh);
      window.removeEventListener(categoriesChangedEvent, refresh);
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
  if (loading) return <DynamicBlockSkeleton layout="cards" tabs={config.tabs.length} items={4} label="กำลังโหลดแท็บข่าว" />;
  const activeTab =
    config.tabs.find((tab) => tab.id === activeId) ?? config.tabs[0];
  const items = posts
    .filter(
      (post) => {
        const matchesOwner =
          !activeTab ||
          activeTab.source.kind === "all" ||
          (activeTab.source.kind === "hospital"
            ? post.unitId === null
            : post.unitId === activeTab.source.unitId);

        return (
          post.status === "published" &&
          matchesOwner &&
          (!activeTab?.categoryId || post.categoryId === activeTab.categoryId)
        );
      },
    )
    .slice(0, 4);
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
      {items.length ? (
        <div className="tabbed-news-content" role="tabpanel">
          <Link
            className="tabbed-news-featured"
            href={`/news/${items[0].slug}`}
          >
            <NewsCover
              mediaId={items[0].coverMediaId}
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
                  mediaId={post.coverMediaId}
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
  mediaId,
  post,
  title,
  show,
}: {
  mediaId: string | null;
  post: DemoPost;
  title: string;
  show: boolean;
}) {
  if (!show) return null;
  const media = getDemoMediaItem(mediaId);
  return (
    <span
      className={`tabbed-news-cover news-cover-viewport ${media ? "" : "fallback-logo"}`}
      style={
        media
          ? undefined
          : { backgroundImage: "url(/hospital-logo.png)" }
      }
      role="img"
      aria-label={`ภาพประกอบ ${title}`}
    >{media ? <NewsCoverImage post={post} media={media} /> : null}</span>
  );
}
