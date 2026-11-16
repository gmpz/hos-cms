import { PublicNewsArticle } from "@/features/news/components/public-news-article";
import { getPostCategoryName, getPublishedPostBySlug, getRelatedPosts } from "@/server/posts/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";
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
  const media = await listPublicMediaItemsByIds(collectMediaIds([post, relatedPosts]));
  return <PublicNewsArticle slug={slug} initialPost={attachResolvedMedia(post, media)} relatedPosts={relatedPosts} categoryLabel={categoryLabel} />;
}
