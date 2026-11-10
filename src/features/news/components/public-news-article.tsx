"use client";
import { useEffect, useRef, useState } from "react";
import { Building2, CalendarDays, Eye, Link2, Mail, Newspaper } from "lucide-react";
import Link from "next/link";
import type { DemoPost } from "@/features/pages/demo/data";
import { useMediaRevision } from "@/features/media/use-media-revision";
import { BlockRenderer } from "@/features/pages/blocks/renderers/block-renderer";
import { incrementPostViewCount } from "../demo/storage";
import { PublicNewsCard } from "./public-news-card";
export function PublicNewsArticle({ slug, initialPost, relatedPosts, categoryLabel }: { slug: string; initialPost: DemoPost | null; relatedPosts: DemoPost[]; categoryLabel: string }) {
  useMediaRevision();
  const post = initialPost;
  const [viewCount, setViewCount] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const countedPostId = useRef<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setShareUrl(new URL(`/news/${slug}`, window.location.origin).toString()), 0);
    return () => window.clearTimeout(timer);
  }, [slug]);
  useEffect(() => {
    if (post && countedPostId.current !== post.id) {
      countedPostId.current = post.id;
      setViewCount(post.viewCount ?? 0);
      void incrementPostViewCount(post.slug).then(setViewCount).catch(() => undefined);
    }
  }, [post, slug]);
  if (!post)
    return (
      <div className="public-news-missing">
        <h1>ไม่พบข่าว</h1>
        <p>ข่าวนี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่ในระบบ</p>
      </div>
    );
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(post.title);
  return (
    <div className="public-news-page">
      <article className="public-news-article">
        <header>
          <span>{categoryLabel}</span>
          <h1>{post.title}</h1>
          <div className="public-news-meta">
            <span className="public-news-published-date">
              <CalendarDays size={16} />
              วันที่เผยแพร่ {post.publishedAt ?? "ยังไม่ระบุ"}
            </span>
            <span>
              <Building2 size={16} />
              โดย {post.owner}
            </span>
            <span className="public-news-view-count">
              <Eye size={17} />
              เข้าชม {viewCount.toLocaleString("th-TH")} ครั้ง
            </span>
          </div>
        </header>
        <div className="public-news-body">
          <BlockRenderer blocks={post.blocks} pdfPositionOnly />
          {shareUrl ? (
            <section className="public-news-share" aria-label="แชร์ข่าวนี้">
              <p>แชร์หน้านี้:</p>
              <div>
                <a
                  className="facebook"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="แชร์ทาง Facebook"
                >
                  f
                </a>
                <a
                  className="line"
                  href={`https://social-plugins.line.me/lineit/share?url=${encodedShareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="แชร์ทาง LINE"
                >
                  LINE
                </a>
                <a
                  className="email"
                  href={`mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`อ่านข่าวนี้ ${shareUrl}`)}`}
                  aria-label="แชร์ทางอีเมล"
                >
                  <Mail size={18} />
                </a>
                <button
                  type="button"
                  className="copy-link"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1800);
                    } catch {
                      setCopied(false);
                    }
                  }}
                  aria-label="คัดลอกลิงก์ข่าว"
                  title={copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                >
                  <Link2 size={18} />
                </button>
                {copied ? <span role="status">คัดลอกแล้ว</span> : null}
              </div>
            </section>
          ) : null}
        </div>
      </article>
      <section
          className="public-related-news"
          aria-labelledby="related-news-heading"
        >
          <div className="public-related-news-heading">
            <div>
              <p>อ่านต่อ</p>
              <h2 id="related-news-heading">ข่าวและผลงานที่เกี่ยวข้อง</h2>
            </div>
          </div>
          {relatedPosts.length > 0 ? <div className="public-related-news-grid">
            {relatedPosts.map((item) => <PublicNewsCard key={item.id} post={item} />)}
          </div> : <div className="public-related-news-empty" role="status">
            <Newspaper size={27} aria-hidden="true" />
            <strong>ยังไม่มีข่าวและผลงานที่เกี่ยวข้อง</strong>
            <p>เมื่อมีรายการเผยแพร่เพิ่มเติม จะแสดงที่นี่</p>
          </div>}
          <Link className="public-related-news-view-all" href="/news">ดูข่าวทั้งหมด</Link>
        </section>
    </div>
  );
}
