import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { NewsCoverImage } from "@/features/news/components/news-cover-image";
import type { SearchItem, SearchNewsMetadata } from "@/server/search/site-search";

export function SearchNewsResultLink({ item, news }: { item: SearchItem; news: SearchNewsMetadata }) {
  return <Link className="site-search-news-card" href={item.href}>
    <span
      className={`site-search-news-cover tabbed-news-cover news-cover-viewport${news.coverUrl ? "" : " fallback-logo"}`}
      style={news.coverUrl ? undefined : { backgroundImage: "url(/hospital-logo.png)" }}
      role="img"
      aria-label={news.coverUrl ? news.coverAlt : "ตราสัญลักษณ์โรงพยาบาล"}
    >
      {news.coverUrl ? <NewsCoverImage post={news} src={news.coverUrl} /> : null}
    </span>
    <span className="site-search-news-content">
      <h3>{item.title}</h3>
      {item.description ? <p className="posts-list-excerpt">{item.description}</p> : null}
      <time dateTime={news.publishedAtIso ?? undefined}><CalendarDays size={14} aria-hidden="true"/>{news.publishedAt ?? "ยังไม่ระบุวันที่"}</time>
    </span>
  </Link>;
}
