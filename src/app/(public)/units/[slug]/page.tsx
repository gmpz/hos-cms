import { AccessDenied } from "@/components/public/access-denied";
import { PublicUnitPage } from "@/features/units/components/public-unit-page";
import { currentUser } from "@/server/auth/session";
import { getUnitAccessBySlug } from "@/server/units/repository";
import { changePasswordPath } from "@/features/auth/return-to";
import { redirect } from "next/navigation";
import { canAccessUnit } from "@/server/access/repository";

export const instant = false;
export default async function UnitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = `/units/${slug}`;
  const accessLevel = await getUnitAccessBySlug(slug);
  if (accessLevel && accessLevel !== "PUBLIC") {
    const user = await currentUser();
    if (!user) redirect(`/login?returnTo=${encodeURIComponent(path)}`);
    if (user.mustChangePassword) redirect(changePasswordPath(path));
    if (!await canAccessUnit(slug, user)) return <AccessDenied/>;
  }
  return <PublicUnitPage slug={slug}/>;
}
