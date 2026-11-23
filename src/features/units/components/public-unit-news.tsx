import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ContentDataSkeleton } from "@/features/pages/blocks/renderers/content-data-skeleton";
import { listPublicPostBlockPage } from "@/server/posts/repository";
import { UnitNewsCarousel } from "./unit-news-carousel";

export function PublicUnitNewsSkeleton() {
  return (
    <div className="unit-news-carousel">
      <div className="unit-news-carousel-controls" aria-hidden="true">
        <button type="button" disabled><ChevronLeft size={20} /></button>
        <button type="button" disabled><ChevronRight size={20} /></button>
      </div>
      <div className="unit-post-grid unit-news-skeleton-track">
        <ContentDataSkeleton kind="news-grid" count={4} immediate />
      </div>
    </div>
  );
}

export async function PublicUnitNews({ unitId }: { unitId: string }) {
  const page = await listPublicPostBlockPage({
    page: 1,
    pageSize: 10,
    source: { kind: "unit", unitId },
    categoryId: null,
  });
  const posts = page.items.filter((post) => post.status === "published" && post.unitId === unitId).slice(0, 10);
  const allNewsHref = `/news?unit=${encodeURIComponent(unitId)}&year=all`;

  return posts.length ? (
    <>
      <UnitNewsCarousel posts={posts} />
      <div className="unit-section-list-summary">
        <span>แสดงข่าวล่าสุด {posts.length} จาก {page.total} รายการ</span>
        {page.total > posts.length ? <Link href={allNewsHref}>ดูข่าวที่เหลือ →</Link> : null}
      </div>
    </>
  ) : (
    <div className="unit-post-grid">
      <div className="unit-empty-state">
        <strong>ไม่พบข่าวและผลงาน</strong>
        <p>กลุ่มงานนี้ยังไม่มีข่าวหรือผลงานที่เผยแพร่</p>
      </div>
    </div>
  );
}
