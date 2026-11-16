import { HomeBuilder } from "@/features/pages/components/home-builder";
import { getCmsPageById, toPageDocument, toSummary } from "@/server/pages/repository";
import { emptyAccessGrants } from "@/features/access/types";
import { collectMediaIds } from "@/features/media/media-references";
import { RouteMedia } from "@/features/media/public-route-media";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { connection } from "next/server";
import { attachResolvedMedia } from "@/server/media/resolve-references";

export const instant = false;

export default async function BuilderPage() {
  await connection();
  const row = await getCmsPageById("home");
  if (!row) throw new Error("ไม่พบหน้าแรก");
  const page = toPageDocument(row);
  if (!page) throw new Error("ข้อมูล Block หน้าแรกไม่ถูกต้อง");
  const publishedPage = toPageDocument(row, true);
  const media = await listPublicMediaItemsByIds(collectMediaIds([page, publishedPage]));
  return <RouteMedia items={media}><HomeBuilder pageId="home" initialPage={attachResolvedMedia(page, media)} initialPublishedPage={attachResolvedMedia(publishedPage, media)} summary={toSummary(row)} initialAccessLevel="PUBLIC" initialAccessGrants={emptyAccessGrants()} accessOptions={{ units: [], users: [] }}/></RouteMedia>;
}
    
