import { PublicNewsList } from "@/features/news/components/public-news-list";

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
  return (
    <PublicNewsList
      initialUnit={typeof query.unit === "string" ? query.unit : "all"}
      initialCategory={
        typeof query.category === "string" ? query.category : "all"
      }
      initialYear={typeof query.year === "string" ? query.year : "latest"}
    />
  );
}
