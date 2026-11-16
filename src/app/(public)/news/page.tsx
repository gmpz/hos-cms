import { PublicNewsList } from "@/features/news/components/public-news-list";
import { PostStatus } from "@prisma/client";
import { listPostPage } from "@/server/posts/repository";

export const instant = false;

export default async function PublicNewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    unit?: string | string[];
    category?: string | string[];
    year?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const unit = typeof query.unit === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(query.unit) ? query.unit : "all";
  const category = typeof query.category === "string" && /^[0-9a-f-]{36}$/i.test(query.category) ? query.category : "all";
  const year = typeof query.year === "string" && (query.year === "all" || (/^\d{4}$/.test(query.year) && Number(query.year) >= 2400 && Number(query.year) <= 2800)) ? query.year : "latest";
  const initialPage = await listPostPage({
    page: 1,
    pageSize: 12,
    search: "",
    unitId: unit === "all" ? null : unit,
    categoryId: category === "all" ? null : category,
    year: year === "latest" ? "latest" : year === "all" ? null : Number(year),
    status: PostStatus.PUBLISHED,
    publicView: true,
  });
  return (
    <PublicNewsList
      initialUnit={unit}
      initialCategory={category}
      initialYear={year}
      initialPage={initialPage}
    />
  );
}
