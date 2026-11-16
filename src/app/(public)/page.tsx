import { PublicHome } from "@/features/pages/components/public-home";
import { PublicInitialLoading } from "@/components/public/public-page-loading";
import { getPublishedCmsPage } from "@/server/pages/repository";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirectHomeToWelcomeIfNeeded } from "@/server/splash-screens/home-redirect";
import { getInitialDocumentBlockPages } from "@/server/documents/block-page-data";
import { getInitialNewsTabPosts } from "@/server/posts/block-tab-data";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";

export const instant = false;

async function HomeContent() {
  await connection();
  await redirectHomeToWelcomeIfNeeded();
  const page = await getPublishedCmsPage("");
  if (!page) return <p>ไม่พบหน้าแรก</p>;
  const [initialDocumentPages, initialNewsTabPosts] = await Promise.all([
    getInitialDocumentBlockPages(page.blocks),
    getInitialNewsTabPosts(page.blocks),
  ]);
  const media = await listPublicMediaItemsByIds(collectMediaIds([page, initialDocumentPages]));
  return <PublicHome page={attachResolvedMedia(page, media)} initialDocumentPages={initialDocumentPages} initialNewsTabPosts={initialNewsTabPosts}/>;
}

export default function Home() {
  return <Suspense fallback={<PublicInitialLoading overlay/>}>
    <HomeContent/>
  </Suspense>;
}
