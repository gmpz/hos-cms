import { PublicHome } from "@/features/pages/components/public-home";
import { PublicInitialLoading } from "@/components/public/public-page-loading";
import { getPublishedCmsPage } from "@/server/pages/repository";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirectHomeToWelcomeIfNeeded } from "@/server/splash-screens/home-redirect";
import { getInitialDocumentBlockPages } from "@/server/documents/block-page-data";
import { getInitialNewsTabPosts } from "@/server/posts/block-tab-data";
import { getInitialPostBlockPages } from "@/server/posts/block-page-data";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";
import { getPublicMediaUrl } from "@/server/media/repository";
import { pagePreview, publicMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedCmsPage("");
  const preview = page ? pagePreview(page) : null;
  return publicMetadata({ path: "/", title: "โรงพยาบาลคลองหลวง", description: preview?.description, imageUrl: await getPublicMediaUrl(preview?.imageId ?? null) });
}

async function HomeContent() {
  await connection();
  await redirectHomeToWelcomeIfNeeded();
  const page = await getPublishedCmsPage("");
  if (!page) return <p>ไม่พบหน้าแรก</p>;
  const [initialDocumentPages, initialNewsTabPosts, initialPostBlockPages] = await Promise.all([
    getInitialDocumentBlockPages(page.blocks),
    getInitialNewsTabPosts(page.blocks),
    getInitialPostBlockPages(page.blocks),
  ]);
  const media = await listPublicMediaItemsByIds(collectMediaIds([page, initialDocumentPages]));
  return <PublicHome page={attachResolvedMedia(page, media)} initialDocumentPages={initialDocumentPages} initialNewsTabPosts={initialNewsTabPosts} initialPostBlockPages={initialPostBlockPages}/>;
}

export default function Home() {
  return <Suspense fallback={<PublicInitialLoading overlay/>}>
    <HomeContent/>
  </Suspense>;
}
