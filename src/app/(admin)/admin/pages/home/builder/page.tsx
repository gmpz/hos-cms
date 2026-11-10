import { HomeBuilder } from "@/features/pages/components/home-builder";
import { getCmsPageById, toPageDocument, toSummary } from "@/server/pages/repository";
import { emptyAccessGrants } from "@/features/access/types";
import { connection } from "next/server";

export const instant = false;

export default async function BuilderPage() {
  await connection();
  const row = await getCmsPageById("home");
  if (!row) throw new Error("ไม่พบหน้าแรก");
  const page = toPageDocument(row);
  if (!page) throw new Error("ข้อมูล Block หน้าแรกไม่ถูกต้อง");
  return <HomeBuilder pageId="home" initialPage={page} initialPublishedPage={toPageDocument(row, true)} summary={toSummary(row)} initialAccessLevel="PUBLIC" initialAccessGrants={emptyAccessGrants()} accessOptions={{ units: [], users: [] }}/>;
}
    
