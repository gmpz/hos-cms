import "server-only";

import type { PageBlock } from "@/features/pages/blocks/config/types";
import type { PublicPostBlockPage } from "@/features/news/public-post-block-page";
import { listPublicPostBlockPage } from "@/server/posts/repository";

export async function getInitialPostBlockPages(blocks: PageBlock[]): Promise<Record<string, PublicPostBlockPage>> {
  const postBlocks = blocks.filter((block): block is Extract<PageBlock, { type: "posts" }> =>
    block.type === "posts" && block.visibility === "visible");
  const pages = await Promise.all(postBlocks.map(async (block) => [
    block.id,
    await listPublicPostBlockPage({ page: 1, pageSize: block.config.limit, source: block.config.source, categoryId: block.config.categoryId }),
  ] as const));
  return Object.fromEntries(pages);
}
