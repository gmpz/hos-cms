import "server-only";

import type { PageBlock } from "@/features/pages/blocks/config/types";
import type { PublicDocumentBlockPage } from "@/features/documents/demo/storage";
import { listPublicDocumentBlockPage } from "@/server/documents/repository";

export async function getInitialDocumentBlockPages(blocks: PageBlock[]): Promise<Record<string, PublicDocumentBlockPage>> {
  const documentBlocks = blocks.filter((block): block is Extract<PageBlock, { type: "documents" }> =>
    block.type === "documents" && block.visibility === "visible");
  const pages = await Promise.all(documentBlocks.map(async (block) => {
    const tab = block.config.tabs[0];
    if (!tab) return null;
    const page = await listPublicDocumentBlockPage({ page: 1, pageSize: block.config.limit, tab });
    return [block.id, page] as const;
  }));
  return Object.fromEntries(pages.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
}
