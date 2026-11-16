import "server-only";

import { CmsPageStatus, UnitStatus } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import type { LinkTargetCatalog } from "@/features/navigation/resolve-link-target";

export async function getPublicLinkTargetCatalog(): Promise<LinkTargetCatalog> {
  const [pages, units] = await Promise.all([
    prisma.cmsPage.findMany({
      where: { status: CmsPageStatus.PUBLISHED, deletedAt: null },
      select: { id: true, path: true },
    }),
    prisma.unit.findMany({
      where: { status: UnitStatus.PUBLISHED, deletedAt: null, publishedSlug: { not: null } },
      select: { id: true, publishedSlug: true },
    }),
  ]);

  return {
    pages: Object.fromEntries(pages.map((page) => [page.id, page.path])),
    units: Object.fromEntries(units.flatMap((unit) => unit.publishedSlug ? [[unit.id, unit.publishedSlug]] : [])),
  };
}
