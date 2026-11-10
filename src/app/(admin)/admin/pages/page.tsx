import { PagesManager } from "@/features/pages/components/pages-manager";
import { listCmsPages } from "@/server/pages/repository";

export const instant = false;

export default async function PagesPage() { return <PagesManager initialPages={await listCmsPages()}/>; }
