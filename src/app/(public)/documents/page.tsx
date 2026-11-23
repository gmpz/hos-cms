import { PublicDocumentsList } from "@/features/documents/components/public-documents-list";
import { publicMetadata } from "@/server/metadata/public-metadata";
import type { Metadata } from "next";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata({ path: "/documents", title: "เอกสาร", description: "ค้นหาและดาวน์โหลดเอกสารเผยแพร่ของโรงพยาบาลคลองหลวง" });
}

export default async function PublicDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    unit?: string | string[];
    category?: string | string[];
    year?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const initialUnit = typeof query.unit === "string" && (query.unit === "all" || /^[a-zA-Z0-9_-]{1,100}$/.test(query.unit)) ? query.unit : "all";
  const initialCategory = typeof query.category === "string" && (query.category === "all" || /^[0-9a-f-]{36}$/i.test(query.category)) ? query.category : "all";
  const initialYear = typeof query.year === "string" && (query.year === "all" || query.year === "latest" || /^\d{4}$/.test(query.year) && Number(query.year) >= 2400 && Number(query.year) <= 2800) ? query.year : "latest";
  return (
    <PublicDocumentsList
      initialUnit={initialUnit}
      initialCategory={initialCategory}
      initialYear={initialYear}
    />
  );
}
