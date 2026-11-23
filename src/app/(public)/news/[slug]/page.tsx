import { PublicNewsArticle } from "@/features/news/components/public-news-article";
import { PublicRelatedNews, PublicRelatedNewsSkeleton } from "@/features/news/components/public-related-news";
import { getPostCategoryName, getPublishedPostBySlug } from "@/server/posts/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";
import { Suspense } from "react";
import { publicMetadata, privatePageMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";
export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return privatePageMetadata;
  return publicMetadata({ path: `/news/${encodeURIComponent(post.slug)}`, title: post.title, description: post.excerpt, imageUrl: post.coverImageUrl, article: true });
}
export default async function NewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  let slug = rawSlug;
  try { slug = decodeURIComponent(rawSlug); } catch { /* Keep malformed paths unmatched. */ }
  const post = await getPublishedPostBySlug(slug);
  const [categoryLabel, media] = await Promise.all([
    post ? getPostCategoryName(post.categoryId) : Promise.resolve("ไม่ระบุหมวดหมู่"),
    listPublicMediaItemsByIds(collectMediaIds(post)),
  ]);
  const relatedNews = post ? <Suspense key={`related-news-${post.id}`} fallback={<PublicRelatedNewsSkeleton/>}>
    <PublicRelatedNews post={post}/>
  </Suspense> : null;
  return <PublicNewsArticle slug={slug} initialPost={attachResolvedMedia(post, media)} relatedNews={relatedNews} categoryLabel={categoryLabel} />;
}
