import "server-only";
import { prisma } from "@/server/database/prisma";

export type PageAccessLevel = "PUBLIC" | "AUTHENTICATED" | "CUSTOM";
export async function getPageAccess(path: string): Promise<PageAccessLevel> {
  if (!process.env.DATABASE_URL) return "PUBLIC";
  const page = await prisma.cmsPage.findUnique({ where: { path }, select: { accessLevel: true, deletedAt: true } });
  if (page && !page.deletedAt) return page.accessLevel;
  return "PUBLIC";
}
