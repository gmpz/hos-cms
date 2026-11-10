import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";

export type MediaUsage = {
  kind: "page" | "post" | "unit" | "document" | "profile" | "site-settings" | "splash" | "announcement";
  id: string;
  title: string;
  location: string;
  href: string;
};

function containsMediaReference(value: Prisma.JsonValue | null | undefined, mediaId: string): boolean {
  if (typeof value === "string") return value === mediaId || value.includes(`#media:${mediaId}`);
  if (Array.isArray(value)) return value.some((item) => containsMediaReference(item, mediaId));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsMediaReference(item, mediaId));
  return false;
}

export async function findMediaUsages(mediaId: string): Promise<MediaUsage[]> {
  const [pages, posts, units, documents, profiles, settings, announcements] = await Promise.all([
    prisma.cmsPage.findMany({ select: { id: true, name: true, draftBlocks: true, publishedBlocks: true, draftHeader: true, publishedHeader: true } }),
    prisma.post.findMany({ select: { id: true, title: true, coverMediaId: true, blocks: true, publishedCoverMediaId: true, publishedSnapshot: true } }),
    prisma.unit.findMany({ select: { id: true, name: true, payload: true, publishedPayload: true } }),
    prisma.document.findMany({ where: { mediaId }, select: { id: true, title: true } }),
    prisma.user.findMany({ where: { profileMediaId: mediaId }, select: { id: true, displayName: true } }),
    prisma.siteSettings.findMany({ where: { logoMediaId: mediaId }, select: { id: true, name: true } }),
    prisma.announcement.findMany({ where: { displayMode: { in: ["SPLASH", "MODAL"] }, deletedAt: null }, select: { id: true, title: true, displayMode: true, imageMediaId: true, publishedSnapshot: true } }),
  ]);

  const usages: MediaUsage[] = [];
  for (const page of pages) {
    const inDraft = containsMediaReference(page.draftBlocks, mediaId) || containsMediaReference(page.draftHeader, mediaId);
    const inPublished = containsMediaReference(page.publishedBlocks, mediaId) || containsMediaReference(page.publishedHeader, mediaId);
    if (inDraft || inPublished) usages.push({
      kind: "page",
      id: page.id,
      title: page.name,
      location: inDraft && inPublished ? "ฉบับร่างและฉบับเผยแพร่" : inPublished ? "ฉบับเผยแพร่" : "ฉบับร่าง",
      href: `/admin/pages/${page.id}/builder`,
    });
  }
  for (const post of posts) {
    const cover = post.coverMediaId === mediaId || post.publishedCoverMediaId === mediaId;
    const content = containsMediaReference(post.blocks, mediaId) || containsMediaReference(post.publishedSnapshot, mediaId);
    if (cover || content) usages.push({
      kind: "post",
      id: post.id,
      title: post.title,
      location: cover && content ? "รูปปกและเนื้อหาข่าว" : cover ? "รูปปกข่าว" : "เนื้อหาข่าว",
      href: `/admin/posts/${post.id}/edit`,
    });
  }
  for (const unit of units) {
    if (containsMediaReference(unit.payload, mediaId) || containsMediaReference(unit.publishedPayload, mediaId)) usages.push({
      kind: "unit",
      id: unit.id,
      title: unit.name,
      location: "ข้อมูลหรือเนื้อหาหน่วยงาน",
      href: `/admin/units/${unit.id}/edit`,
    });
  }
  for (const document of documents) usages.push({ kind: "document", id: document.id, title: document.title, location: "ไฟล์เอกสาร", href: "/admin/documents" });
  for (const profile of profiles) usages.push({ kind: "profile", id: profile.id, title: profile.displayName, location: "รูปโปรไฟล์ผู้ใช้", href: `/admin/users/${profile.id}/edit` });
  for (const setting of settings) usages.push({ kind: "site-settings", id: String(setting.id), title: setting.name, location: "โลโก้เว็บไซต์", href: "/admin/settings/theme" });
  for (const announcement of announcements) {
    const inDraft = announcement.imageMediaId === mediaId;
    const inPublished = containsMediaReference(announcement.publishedSnapshot, mediaId);
    if (!inDraft && !inPublished) continue;
    const isSplash = announcement.displayMode === "SPLASH";
    const label = isSplash ? "Splash Screen" : "ประกาศ";
    usages.push({ kind: isSplash ? "splash" : "announcement", id: announcement.id, title: announcement.title,
      location: inDraft && inPublished ? `ร่างและฉบับเผยแพร่ ${label}` : inPublished ? `ฉบับเผยแพร่ ${label}` : `ร่าง ${label}`,
      href: isSplash ? `/admin/splash-screens/${announcement.id}/edit` : `/admin/announcements/${announcement.id}/edit` });
  }
  return usages;
}
