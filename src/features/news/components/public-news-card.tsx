"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import {
  getDemoMediaItem,
} from "@/features/media/demo/media-registry";
import type { DemoPost } from "@/features/pages/demo/data";
import { NewsCoverImage } from "./news-cover-image";
import { useMediaRevision } from "@/features/media/use-media-revision";

export function PublicNewsCard({ post }: { post: DemoPost }) {
  const hydrated = useMediaRevision();
  const cover = hydrated ? getDemoMediaItem(post.coverMediaId) : undefined;
  return (
    <article className="public-news-index-card">
      <Link href={`/news/${post.slug}`} className="public-related-news-card-link" aria-label={`อ่านข่าว ${post.title}`}>
        <span className={`public-related-news-cover public-news-index-cover news-cover-viewport ${cover ? "" : "fallback-logo"}`} style={cover ? undefined : { backgroundImage: "url(/hospital-logo.png)" }} role="img" aria-label={cover?.alt ?? "ตราสัญลักษณ์โรงพยาบาล"}>
          {cover ? <NewsCoverImage post={post} media={cover} /> : null}
        </span>
        {post.isNew ? <span className="news-new-badge">ใหม่</span> : null}
        <div>
          <h2 className="standard-news-card-title">{post.title}</h2>
          <footer className="standard-news-card-footer"><span><CalendarDays size={14} aria-hidden="true" />{post.publishedAt ?? "ยังไม่ระบุวันที่"}</span></footer>
        </div>
      </Link>
    </article>
  );
}
