import { HomeBuilder } from "@/features/pages/components/home-builder";
import { getCmsPageById, getCmsPageGrants, toPageDocument, toSummary } from "@/server/pages/repository";
import { listAccessOptions } from "@/server/access/repository";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export const instant = false;

export default async function PageBuilder({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const row = await getCmsPageById(id);
  if (!row) notFound();
  const page = toPageDocument(row);
  if (!page) throw new Error("ข้อมูล Block ของหน้าไม่ถูกต้อง");
  const [initialAccessGrants, accessOptions] = await Promise.all([getCmsPageGrants(id), listAccessOptions()]);
  return <HomeBuilder pageId={id} initialPage={page} initialPublishedPage={toPageDocument(row, true)} summary={toSummary(row)} initialAccessLevel={row.accessLevel} initialAccessGrants={initialAccessGrants} accessOptions={accessOptions}/>;
}
