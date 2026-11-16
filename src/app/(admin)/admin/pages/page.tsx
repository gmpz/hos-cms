import { PagesManager } from "@/features/pages/components/pages-manager";
import { listCmsPages, listDeletedCmsPages } from "@/server/pages/repository";

export const instant = false;

export default async function PagesPage() {
  const [initialPages, initialDeletedPages] = await Promise.all([listCmsPages(), listDeletedCmsPages()]);
  return <PagesManager initialPages={initialPages} initialDeletedPages={initialDeletedPages}/>;
}
