import { AccessDenied } from "@/components/public/access-denied";
import { PublicUnitPage } from "@/features/units/components/public-unit-page";
import { currentUser } from "@/server/auth/session";
import { getUnitAccessBySlug, listUnits } from "@/server/units/repository";
import { changePasswordPath } from "@/features/auth/return-to";
import { redirect } from "next/navigation";
import { canAccessUnit } from "@/server/access/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { attachResolvedMedia } from "@/server/media/resolve-references";

export const instant = false;
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
  const unit = (await listUnits(false, user)).find((item) => item.slug === slug);
  const media = await listPublicMediaItemsByIds(collectMediaIds(unit));
  return <PublicUnitPage slug={slug} previewUnit={attachResolvedMedia(unit, media)}/>;
}
