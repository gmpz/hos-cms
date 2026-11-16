import { HomeBuilder } from "@/features/pages/components/home-builder";
import { getCmsPageById, getCmsPageGrants, toPageDocument, toSummary } from "@/server/pages/repository";
import { listAccessOptions } from "@/server/access/repository";
import { collectMediaIds } from "@/features/media/media-references";
import { RouteMedia } from "@/features/media/public-route-media";
import { listPublicMediaItemsByIds } from "@/server/media/repository";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { attachResolvedMedia } from "@/server/media/resolve-references";

export const instant = false;

export default async function PageBuilder({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const row = await getCmsPageById(id);
  if (!row) notFound();
  const page = toPageDocument(row);
  if (!page) throw new Error("ข้อมูล Block ของหน้าไม่ถูกต้อง");
  const publishedPage = toPageDocument(row, true);
  const [initialAccessGrants, accessOptions, media] = await Promise.all([getCmsPageGrants(id), listAccessOptions(), listPublicMediaItemsByIds(collectMediaIds([page, publishedPage]))]);
  return <RouteMedia items={media}><HomeBuilder pageId={id} initialPage={attachResolvedMedia(page, media)} initialPublishedPage={attachResolvedMedia(publishedPage, media)} summary={toSummary(row)} initialAccessLevel={row.accessLevel} initialAccessGrants={initialAccessGrants} accessOptions={accessOptions}/></RouteMedia>;
}
