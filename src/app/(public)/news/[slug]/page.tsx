import { PublicNewsArticle } from "@/features/news/components/public-news-article";
import { getPostCategoryName, getPublishedPostBySlug, getRelatedPosts } from "@/server/posts/repository";
export const instant = false;
export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try { slug = decodeURIComponent(rawSlug); } catch { /* Keep malformed paths unmatched. */ }
  const post = await getPublishedPostBySlug(slug);
  const [relatedPosts, categoryLabel] = post
    ? await Promise.all([getRelatedPosts(post), getPostCategoryName(post.categoryId)])
    : [[], "ไม่ระบุหมวดหมู่"];
  return <PublicNewsArticle slug={slug} initialPost={post} relatedPosts={relatedPosts} categoryLabel={categoryLabel} />;
}
