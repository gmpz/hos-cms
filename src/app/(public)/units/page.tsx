import { PublicUnitsList } from "@/features/units/components/public-units-list";
import { currentUser } from "@/server/auth/session";
import { listPublicUnitPage } from "@/server/units/repository";
import { publicMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata({ path: "/units", title: "หน่วยงาน", description: "ข้อมูลหน่วยงานและบริการของโรงพยาบาลคลองหลวง" });
}

export default async function UnitsPage() {
  const initialPage = await listPublicUnitPage({ page: 1, pageSize: 20, search: "" }, await currentUser());
  return <PublicUnitsList initialPage={initialPage}/>;
}
