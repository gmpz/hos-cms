import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminInitialLoading } from "@/components/admin/admin-initial-loading";
import { currentUser } from "@/server/auth/session";
import { redirect } from "next/navigation";
import { changePasswordPath } from "@/features/auth/return-to";
import { UnitBootstrap } from "@/features/units/components/unit-bootstrap";
import { getSiteSettings } from "@/server/site-settings/repository";
import type { SiteSettings } from "@/features/site-settings/types";

export const instant = false;

async function getCachedSiteSettings() {
  "use cache";
  cacheLife("max");
  cacheTag("site-settings");
  return getSiteSettings();
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const settings = await getCachedSiteSettings();

  return (
    <Suspense fallback={<AdminInitialLoading theme={settings.theme} />}>
      <AuthenticatedAdminShell settings={settings}>{children}</AuthenticatedAdminShell>
    </Suspense>
  );
}

async function AuthenticatedAdminShell({ children, settings }: { children: React.ReactNode; settings: SiteSettings }) {
  const user = await currentUser();
  if (!user) redirect("/login?returnTo=/admin");
  if (user.mustChangePassword) redirect(changePasswordPath("/admin"));
  if (user.role !== "ADMIN") redirect("/");
  return <><UnitBootstrap includeDrafts /><AdminShell displayName={user.displayName} photoUrl={user.photoUrl} photoFocusX={user.profilePhotoFocusX} photoFocusY={user.profilePhotoFocusY} photoZoom={user.profilePhotoZoom} initialSettings={settings}>{children}</AdminShell></>;
}
