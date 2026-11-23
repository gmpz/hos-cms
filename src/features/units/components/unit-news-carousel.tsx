"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PublicNewsCard } from "@/features/news/components/public-news-card";
import type { DemoPost } from "@/features/pages/demo/data";

export function UnitNewsCarousel({ posts }: { posts: DemoPost[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateControls = () => {
      const end = track.scrollWidth - track.clientWidth;
      setCanScroll({ left: track.scrollLeft > 1, right: track.scrollLeft < end - 1 });
    };
    updateControls();
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    track.addEventListener("scroll", updateControls, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", updateControls);
    };
  }, [posts.length]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild;
    const cardWidth = card?.getBoundingClientRect().width ?? 240;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (cardWidth + gap), behavior: "smooth" });
  };

  useEffect(() => {
    if (posts.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const end = track.scrollWidth - track.clientWidth;
      if (end <= 1) return;
      if (track.scrollLeft >= end - 1) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const cardWidth = track.firstElementChild?.getBoundingClientRect().width ?? 240;
        const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
        track.scrollBy({ left: cardWidth + gap, behavior: "smooth" });
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [posts.length, paused]);

  return (
    <div
      className="unit-news-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="unit-news-carousel-controls" aria-label="เลื่อนรายการข่าว">
        <button type="button" onClick={() => move(-1)} disabled={!canScroll.left} aria-label="เลื่อนข่าวไปทางซ้าย">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => move(1)} disabled={!canScroll.right} aria-label="เลื่อนข่าวไปทางขวา">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="unit-post-grid" ref={trackRef} aria-label="ข่าวล่าสุดของกลุ่มงาน">
        {posts.map((post) => <PublicNewsCard post={post} key={post.id} showExcerpt />)}
      </div>
    </div>
  );
}
