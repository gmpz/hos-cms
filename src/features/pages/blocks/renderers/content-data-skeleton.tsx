"use client";

import type { ReactNode } from "react";
import { usePublicLoading } from "@/components/public/use-public-loading";

function Copy() {
  return <span className="block-skeleton-lines"><span className="public-loading-shape"/><span className="public-loading-shape"/></span>;
}

export function ContentDataSkeleton({ kind, count, columns = 3, showImage = true, showDescription = true, immediate = false, footer }: {
  kind: "news-grid" | "news-list" | "news-tabs" | "documents" | "table" | "personnel";
  count: number;
  immediate?: boolean;
  footer?: ReactNode;
  columns?: number;
  showImage?: boolean;
  showDescription?: boolean;
}) {
  const delayedVisible = usePublicLoading(true);
  const visible = immediate || delayedVisible;
  const items = Array.from({ length: count }, (_, i) => i);
  const newsRow = (i: number) => <a key={i} aria-hidden="true">{showImage ? <span className="tabbed-news-cover public-loading-shape"/> : null}<div><h3><Copy/></h3>{showDescription ? <p className={kind === "news-list" ? "posts-list-excerpt" : "tabbed-news-excerpt"}><span className="public-loading-shape news-list-excerpt-skeleton"/></p> : null}<time><span className="public-loading-shape news-list-date-skeleton"/></time></div></a>;
  return <div className={`configured-data-skeleton${visible ? "" : " public-skeleton-waiting"}`} role="status" aria-label="กำลังโหลดข้อมูล" aria-busy="true">
    {kind === "news-grid" ? <div className="public-news-index-grid public-news-list-grid posts-content-cards">{items.map(i => <article className="public-news-index-card" key={i} aria-hidden="true"><span className="public-related-news-card-link"><span className="public-related-news-cover public-news-index-cover public-loading-shape"/><div><h2 className="standard-news-card-title"><Copy/></h2><p className="standard-news-card-excerpt"><Copy/></p><footer className="standard-news-card-footer"><span className="public-loading-shape news-grid-date-skeleton"/></footer></div></span></article>)}</div> : null}
    {kind === "news-list" ? <div className={`tabbed-news-list posts-content-cards posts-content-list ${count < 4 ? "is-sparse" : ""}`}>{items.map(newsRow)}</div> : null}
    {kind === "news-tabs" ? <div className="tabbed-news-content"><a className="tabbed-news-featured" aria-hidden="true">{showImage ? <span className="tabbed-news-cover public-loading-shape"/> : null}<div className={showDescription ? undefined : "without-description"}><small><Copy/></small><h3><Copy/></h3>{showDescription ? <p><Copy/></p> : null}<time><Copy/></time></div></a><div className="tabbed-news-list">{items.slice(1).map(newsRow)}</div></div> : null}
    {kind === "personnel" ? <div className={`personnel-block-grid columns-${columns}`}>{items.map(i => <article key={i} aria-hidden="true"><div className="personnel-block-photo public-loading-shape"/><div><h3><Copy/></h3><p><Copy/></p></div></article>)}</div> : null}
    {kind === "documents" ? <div className="unit-document-list document-block-list">{items.map(i => <div className="unit-document-row-with-download" key={i} aria-hidden="true"><span className="unit-document-open"><span className="document-file-icon document-skeleton-icon public-loading-shape"/><span className="document-skeleton-copy"><span className="document-skeleton-title public-loading-shape"/><span className="document-skeleton-meta"><span className="public-loading-shape"/></span></span></span><span className="public-document-action public-document-download document-skeleton-download public-loading-shape"/></div>)}{footer}</div> : null}
    {kind === "table" ? <div className="document-block-table-shell"><div className="document-block-table-wrap"><table className="document-block-table"><thead><tr><th>เอกสาร</th><th className="document-block-table-date">วันที่เผยแพร่</th><th className="document-block-table-downloads">ดาวน์โหลด</th><th aria-label="เปิดไฟล์"/></tr></thead><tbody>{items.map(i => <tr key={i} aria-hidden="true"><td><span className="document-block-table-title"><span className="document-file-icon document-skeleton-icon public-loading-shape"/><span className="document-skeleton-table-title"><span className="public-loading-shape"/><span className="public-loading-shape"/></span></span></td><td className="document-block-table-date"><span className="document-skeleton-date public-loading-shape"/></td><td className="document-block-table-downloads"><span className="document-skeleton-count public-loading-shape"/></td><td><span className="document-block-table-action"><span className="document-skeleton-action public-loading-shape"/></span></td></tr>)}</tbody></table></div>{footer}</div> : null}
  </div>;
}
