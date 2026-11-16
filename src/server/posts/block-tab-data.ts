import "server-only";

import type { PageBlock } from "@/features/pages/blocks/config/types";
import type { DemoPost } from "@/features/pages/demo/data";
import { listPublicNewsTabPosts } from "@/server/posts/repository";

export async function getInitialNewsTabPosts(blocks: PageBlock[]): Promise<Record<string, DemoPost[]>> {
  const newsBlocks = blocks.filter((block): block is Extract<PageBlock, { type: "newsTabs" }> =>
    block.type === "newsTabs" && block.visibility === "visible");
  const results = await Promise.all(newsBlocks.map(async (block) => {
    const tab = block.config.tabs[0];
    if (!tab) return null;
    return [block.id, await listPublicNewsTabPosts(tab)] as const;
  }));
  return Object.fromEntries(results.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
}
