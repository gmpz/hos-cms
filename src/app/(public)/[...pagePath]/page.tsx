import { AccessDenied } from "@/components/public/access-denied";
import { PublicContentPage } from "@/features/pages/components/public-content-page";
import { currentUser } from "@/server/auth/session";
import { getPageAccess } from "@/server/pages/access";
import { redirect } from "next/navigation";
import { canAccessPage } from "@/server/access/repository";
import { changePasswordPath } from "@/features/auth/return-to";
import { getPublishedCmsPage } from "@/server/pages/repository";
import { getInitialDocumentBlockPages } from "@/server/documents/block-page-data";
import { getInitialNewsTabPosts } from "@/server/posts/block-tab-data";
import { getInitialPostBlockPages } from "@/server/posts/block-page-data";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";
import { getPublicMediaUrl } from "@/server/media/repository";
import { pagePreview, privatePageMetadata, publicMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ pagePath: string[] }> }): Promise<Metadata> {
  const { pagePath } = await params;
  const path = pagePath.join("/");
  if (await getPageAccess(path) !== "PUBLIC") return privatePageMetadata;
  const page = await getPublishedCmsPage(path);
  if (!page) return privatePageMetadata;
  const preview = pagePreview(page);
  return publicMetadata({ path: `/${path}`, title: preview.title, description: preview.description, imageUrl: await getPublicMediaUrl(preview.imageId) });
}

export default async function CmsPage({ params }: { params: Promise<{ pagePath: string[] }> }) {
  const { pagePath } = await params;
  const path = pagePath.join("/");
  const accessLevel = await getPageAccess(path);
  if (accessLevel !== "PUBLIC") {
    const user = await currentUser();
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/${path}`)}`);
    if (user.mustChangePassword) redirect(changePasswordPath(`/${path}`));
    if (!await canAccessPage(path, user)) return <AccessDenied/>;
  }
  const page = await getPublishedCmsPage(path);
  if (!page) return <div className="public-content-missing"><h1>ไม่พบหน้าเว็บไซต์</h1><p>หน้านี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่ในระบบ</p></div>;
  const [initialDocumentPages, initialNewsTabPosts, initialPostBlockPages] = await Promise.all([
    getInitialDocumentBlockPages(page.blocks),
    getInitialNewsTabPosts(page.blocks),
    getInitialPostBlockPages(page.blocks),
  ]);
  const media = await listPublicMediaItemsByIds(collectMediaIds([page, initialDocumentPages]));
  return <PublicContentPage page={attachResolvedMedia(page, media)} initialDocumentPages={initialDocumentPages} initialNewsTabPosts={initialNewsTabPosts} initialPostBlockPages={initialPostBlockPages}/>;
}
