import { AccessDenied } from "@/components/public/access-denied";
import { PublicUnitPage } from "@/features/units/components/public-unit-page";
import { currentUser } from "@/server/auth/session";
import { getUnitAccessBySlug, getPublicUnitBySlug } from "@/server/units/repository";
import { changePasswordPath } from "@/features/auth/return-to";
import { redirect } from "next/navigation";
import { canAccessUnit } from "@/server/access/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";
import { listPublicDocumentBlockPage } from "@/server/documents/repository";
import { privatePageMetadata, publicMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicUnitNews, PublicUnitNewsSkeleton } from "@/features/units/components/public-unit-news";

export const instant = false;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (await getUnitAccessBySlug(slug) !== "PUBLIC") return privatePageMetadata;
  const unit = await getPublicUnitBySlug(slug, null);
  if (!unit) return privatePageMetadata;
  return publicMetadata({ path: `/units/${encodeURIComponent(unit.slug)}`, title: unit.name, description: unit.summary, imageUrl: unit.coverImageUrl });
}
export default async function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = `/units/${slug}`;
  const accessLevel = await getUnitAccessBySlug(slug);
  const user = await currentUser();
  if (accessLevel && accessLevel !== "PUBLIC") {
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`);
    if (user.mustChangePassword) redirect(changePasswordPath(path));
    if (!await canAccessUnit(slug, user)) return <AccessDenied/>;
  }
  const unit = await getPublicUnitBySlug(slug, user);
  const media = await listPublicMediaItemsByIds(collectMediaIds(unit));
  const documentPage = unit ? await listPublicDocumentBlockPage({ page: 1, pageSize: 10, tab: { source: { kind: "unit", unitId: unit.id }, categoryId: null, fiscalYear: "all" } }) : null;
  const newsContent = unit && unit.sectionVisibility.posts ? (
    <Suspense fallback={<PublicUnitNewsSkeleton />}>
      <PublicUnitNews unitId={unit.id} />
    </Suspense>
  ) : null;
  return <PublicUnitPage previewUnit={attachResolvedMedia(unit, media) ?? undefined} newsContent={newsContent} initialDocuments={documentPage?.items ?? []} initialDocumentTotal={documentPage?.total ?? 0} documentsLoaded={Boolean(unit)}/>;
}
