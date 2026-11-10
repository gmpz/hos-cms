import { AccessDenied } from "@/components/public/access-denied";
import { PublicContentPage } from "@/features/pages/components/public-content-page";
import { currentUser } from "@/server/auth/session";
import { getPageAccess } from "@/server/pages/access";
import { redirect } from "next/navigation";
import { canAccessPage } from "@/server/access/repository";
import { changePasswordPath } from "@/features/auth/return-to";
import { getPublishedCmsPage } from "@/server/pages/repository";

export const instant = false;

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
  return page ? <PublicContentPage page={page}/> : <div className="public-content-missing"><h1>ไม่พบหน้าเว็บไซต์</h1><p>หน้านี้ยังไม่ได้เผยแพร่หรือไม่มีอยู่ในระบบ</p></div>;
}
