import type { ReactNode } from "react";
import { Newspaper } from "lucide-react";
import Link from "next/link";
import type { DemoPost } from "@/features/pages/demo/data";
import { ContentDataSkeleton } from "@/features/pages/blocks/renderers/content-data-skeleton";
import { getRelatedPosts } from "@/server/posts/repository";
import { PublicNewsCard } from "./public-news-card";

function RelatedNewsShell({ children }: { children: ReactNode }) {
  return <section className="public-related-news" aria-labelledby="related-news-heading">
    <div className="public-related-news-heading">
      <div><p>อ่านต่อ</p><h2 id="related-news-heading">ข่าวและผลงานที่เกี่ยวข้อง</h2></div>
    </div>
    {children}
    <Link className="public-related-news-view-all" href="/news">ดูข่าวทั้งหมด</Link>
  </section>;
}

export function PublicRelatedNewsSkeleton() {
  return <RelatedNewsShell><ContentDataSkeleton kind="news-grid" count={4} immediate /></RelatedNewsShell>;
}

export async function PublicRelatedNews({ post }: { post: DemoPost }) {
  const relatedPosts = await getRelatedPosts(post);
  return <RelatedNewsShell>
    {relatedPosts.length > 0 ? <div className="public-news-index-grid public-news-list-grid">
      {relatedPosts.map((item) => <PublicNewsCard key={item.id} post={item} showExcerpt />)}
    </div> : <div className="public-related-news-empty" role="status">
      <Newspaper size={27} aria-hidden="true" />
      <strong>ยังไม่มีข่าวและผลงานที่เกี่ยวข้อง</strong>
      <p>เมื่อมีรายการเผยแพร่เพิ่มเติม จะแสดงที่นี่</p>
    </div>}
  </RelatedNewsShell>;
}
