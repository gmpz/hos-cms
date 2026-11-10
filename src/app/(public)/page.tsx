import { PublicHome } from "@/features/pages/components/public-home";
import { PublicInitialLoading } from "@/components/public/public-page-loading";
import { getPublishedCmsPage } from "@/server/pages/repository";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { redirectHomeToWelcomeIfNeeded } from "@/server/splash-screens/home-redirect";
import { listActivePublicAnnouncements } from "@/server/announcements/repository";
import { visiblePublicAnnouncements } from "@/features/announcements/public-visibility";
import { PublicAnnouncementGate } from "@/features/announcements/components/public-announcement-gate";

export const instant = false;

async function HomeContent() {
  await connection();
  await redirectHomeToWelcomeIfNeeded();
  const cookieStore = await cookies();
  const [page, announcements] = await Promise.all([getPublishedCmsPage(""), listActivePublicAnnouncements()]);
  if (!page) return <p>ไม่พบหน้าแรก</p>;
  return <>
    <PublicAnnouncementGate announcements={visiblePublicAnnouncements(announcements, (name) => cookieStore.get(name)?.value)} showAnnouncements />
    <PublicHome page={page}/>
  </>;
}

export default function Home() {
  return <Suspense fallback={<PublicInitialLoading overlay/>}>
    <HomeContent/>
  </Suspense>;
}
