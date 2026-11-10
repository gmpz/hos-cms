import "server-only";

import { connection } from "next/server";
import { prisma } from "@/server/database/prisma";
import { todaySiteVisits } from "@/server/analytics/site-visits";
import { currentUser } from "@/server/auth/session";

export async function getAdminDashboardData() {
  await connection();
  const [pages, posts, documents, media, units, activities, settings, visits, user] = await Promise.all([
    prisma.cmsPage.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.post.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.document.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.mediaAsset.groupBy({ by: ["kind"], _count: { _all: true } }),
    prisma.unit.count({ where: { id: { not: "hospital" } } }),
    prisma.auditLog.findMany({ take: 4, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], select: { id: true, action: true, summary: true, entityType: true, occurredAt: true, actor: { select: { displayName: true } } } }),
    prisma.siteSettings.findUnique({ where: { id: 1 }, select: { name: true, homepageId: true } }),
    todaySiteVisits(),
    currentUser(),
  ]);
  const count = (rows: { status: string; _count: { _all: number } }[], status: string) => rows.find((row) => row.status === status)?._count._all ?? 0;
  const pageCount = pages.reduce((sum, row) => sum + row._count._all, 0);
  const postCount = posts.reduce((sum, row) => sum + row._count._all, 0);
  const documentCount = documents.reduce((sum, row) => sum + row._count._all, 0);
  const mediaCount = media.reduce((sum, row) => sum + row._count._all, 0);
  const published = count(pages, "PUBLISHED") + count(posts, "PUBLISHED") + count(documents, "PUBLISHED");
  const drafts = count(pages, "DRAFT") + count(posts, "DRAFT") + count(documents, "DRAFT");
  const activeContent = published + drafts;
  const homepage = await prisma.cmsPage.findFirst({
    where: { id: settings?.homepageId ?? "home", status: "PUBLISHED", deletedAt: null },
    select: { id: true },
  });

  return {
    hospitalName: settings?.name ?? "ยังไม่ได้ตั้งค่าชื่อโรงพยาบาล",
    displayName: user?.displayName ?? "ผู้ดูแลระบบ",
    pages: { total: pageCount, published: count(pages, "PUBLISHED") },
    posts: { total: postCount, published: count(posts, "PUBLISHED") },
    documents: { total: documentCount, published: count(documents, "PUBLISHED") },
    media: { total: mediaCount, images: media.find((row) => row.kind === "IMAGE")?._count._all ?? 0, files: media.find((row) => row.kind === "DOCUMENT")?._count._all ?? 0 },
    units,
    published,
    drafts,
    publishedPercent: activeContent ? published / activeContent * 100 : 0,
    draftPercent: activeContent ? drafts / activeContent * 100 : 0,
    homepagePublished: Boolean(homepage),
    activities,
    visits,
  };
}
