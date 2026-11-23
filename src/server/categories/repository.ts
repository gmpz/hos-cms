import "server-only";

import { CategoryScope } from "@prisma/client";
import type { DemoCategory } from "@/features/categories/types";
import { prisma } from "@/server/database/prisma";

export async function listPublicCategoryCatalog(): Promise<{ posts: DemoCategory[]; documents: DemoCategory[] }> {
  const rows = await prisma.category.findMany({
    where: { scope: { in: [CategoryScope.POSTS, CategoryScope.DOCUMENTS] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, sortOrder: true, active: true, scope: true },
  });
  const toCatalog = (scope: CategoryScope) => rows
    .filter((row) => row.scope === scope)
    .map(({ id, name, sortOrder, active }) => ({ id, name, sortOrder, active }));
  return {
    posts: toCatalog(CategoryScope.POSTS),
    documents: toCatalog(CategoryScope.DOCUMENTS),
  };
}

export async function categoryUsageCounts(scope: "posts" | "documents"): Promise<Record<string, number>> {
  if (scope === "posts") {
    const groups = await prisma.post.groupBy({ by: ["categoryId"], where: { deletedAt: null }, _count: { _all: true } });
    return Object.fromEntries(groups.map((group) => [group.categoryId, group._count._all]));
  }
  const groups = await prisma.document.groupBy({ by: ["categoryId"], where: { deletedAt: null }, _count: { _all: true } });
  return Object.fromEntries(groups.map((group) => [group.categoryId, group._count._all]));
}
