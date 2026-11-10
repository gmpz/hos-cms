import "server-only";

import { CmsPageStatus, DocumentStatus, PageAccessLevel, PostStatus, Prisma, UnitStatus } from "@prisma/client";
import { documentFileUrl } from "@/features/documents/document-file-name";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

export type SearchKind = "news" | "documents" | "units" | "pages";
export type SearchNewsMetadata = {
  coverUrl: string | null;
  coverAlt: string;
  coverFit: "cover" | "contain";
  coverFocus: { x: number; y: number };
  coverZoom: number;
  publishedAt: string | null;
  publishedAtIso: string | null;
};
export type SearchDocumentMetadata = {
  file: { name: string; mimeType: string; size: string } | null;
  publishedAt: string | null;
  downloadCount: number;
};
export type SearchItem = { id: string; title: string; description: string; href: string; documentAction?: "open" | "download"; document?: SearchDocumentMetadata; news?: SearchNewsMetadata };
export type SearchGroup = { kind: SearchKind; label: string; total: number; items: SearchItem[] };

const pageSize = 10;
const previewSize = 5;

function preview(text: string | null | undefined, term?: string): string {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  const matchAt = term ? normalized.toLocaleLowerCase("th").indexOf(term.toLocaleLowerCase("th")) : -1;
  const start = matchAt > 55 ? matchAt - 55 : 0;
  const excerpt = normalized.slice(start, start + 180);
  return `${start ? "…" : ""}${excerpt}${start + 180 < normalized.length ? "…" : ""}`;
}

function publishedText(value: unknown): string {
  if (Array.isArray(value)) return value.map(publishedText).join(" ");
  if (!value || typeof value !== "object") return "";
  return Object.entries(value).map(([key, item]) => {
    if (typeof item === "string") return ["text", "title", "description", "summary", "label", "caption", "content"].includes(key) ? item : "";
    return publishedText(item);
  }).join(" ");
}

export async function searchSite(query: string, selectedKind: SearchKind | null, page: number): Promise<SearchGroup[]> {
  const term = query.trim().slice(0, 100);
  if (term.length < 2) return [];
  const skip = selectedKind ? (page - 1) * pageSize : 0;
  const take = selectedKind ? pageSize : previewSize;
  const postWhere: Prisma.PostWhereInput = {
    status: PostStatus.PUBLISHED, deletedAt: null, publishedSnapshot: { not: Prisma.DbNull },
    OR: [{ publishedTitle: { contains: term } }, { publishedExcerpt: { contains: term } }],
  };
  const documentWhere: Prisma.DocumentWhereInput = {
    status: DocumentStatus.PUBLISHED, deletedAt: null,
    OR: [{ title: { contains: term } }, { description: { contains: term } }, { documentNumber: { contains: term } }],
  };

  const [postCount, posts, documentCount, documents, pages, units] = await Promise.all([
    prisma.post.count({ where: postWhere }),
    selectedKind && selectedKind !== "news" ? Promise.resolve([]) : prisma.post.findMany({ where: postWhere, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], skip: selectedKind === "news" ? skip : 0, take, select: { id: true, slug: true, publishedTitle: true, publishedExcerpt: true, publishedAt: true, publishedCoverMediaId: true, publishedCoverFit: true, publishedCoverFocusX: true, publishedCoverFocusY: true, publishedCoverZoom: true } }),
    prisma.document.count({ where: documentWhere }),
    selectedKind && selectedKind !== "documents" ? Promise.resolve([]) : prisma.document.findMany({ where: documentWhere, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }], skip: selectedKind === "documents" ? skip : 0, take, select: { id: true, title: true, description: true, mediaId: true, publishedAt: true, downloadCount: true } }),
    prisma.cmsPage.findMany({ where: { status: CmsPageStatus.PUBLISHED, accessLevel: PageAccessLevel.PUBLIC, deletedAt: null, publishedBlocks: { not: Prisma.DbNull } }, select: { id: true, path: true, name: true, publishedBlocks: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { id: { not: "hospital" }, status: UnitStatus.PUBLISHED, publishedAccessLevel: PageAccessLevel.PUBLIC, publishedSlug: { not: null }, publishedPayload: { not: Prisma.DbNull } }, select: { id: true, publishedSlug: true, publishedPayload: true }, orderBy: { name: "asc" } }),
  ]);

  const mediaIds = [...new Set([...documents.flatMap((document) => document.mediaId ? [document.mediaId] : []), ...posts.flatMap((post) => post.publishedCoverMediaId ? [post.publishedCoverMediaId] : [])])];
  const media = mediaIds.length ? await prisma.mediaAsset.findMany({ where: { id: { in: mediaIds } }, select: { id: true, name: true, mimeType: true, sizeBytes: true, fileName: true, alt: true } }) : [];
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const lowerTerm = term.toLocaleLowerCase("th");
  const matchingPages = pages.filter((item) => `${item.name} ${publishedText(item.publishedBlocks)}`.toLocaleLowerCase("th").includes(lowerTerm));
  const matchingUnits = units.flatMap((item) => {
    const payload = item.publishedPayload && typeof item.publishedPayload === "object" && !Array.isArray(item.publishedPayload) ? item.publishedPayload : {};
    const name = typeof payload.name === "string" ? payload.name : "";
    const shortName = typeof payload.shortName === "string" ? payload.shortName : "";
    const summary = typeof payload.summary === "string" ? payload.summary : "";
    return `${name} ${shortName} ${summary}`.toLocaleLowerCase("th").includes(lowerTerm) ? [{ id: item.id, title: name || shortName, description: preview(summary, term), href: `/units/${item.publishedSlug}` }] : [];
  });
  const slice = <T,>(kind: SearchKind, items: T[]) => selectedKind === kind ? items.slice(skip, skip + take) : selectedKind ? [] : items.slice(0, take);

  return [
    { kind: "news", label: "ข่าวสาร", total: postCount, items: posts.map((item) => {
      const cover = item.publishedCoverMediaId ? mediaById.get(item.publishedCoverMediaId) : null;
      return { id: item.id, title: item.publishedTitle ?? "", description: preview(item.publishedExcerpt, term), href: `/news/${item.slug}`, news: {
        coverUrl: cover ? mediaPublicUrl(cover.fileName) : null,
        coverAlt: cover?.alt || `ภาพประกอบ ${item.publishedTitle ?? "ข่าว"}`,
        coverFit: item.publishedCoverFit === "cover" ? "cover" as const : "contain" as const,
        coverFocus: { x: item.publishedCoverFocusX, y: item.publishedCoverFocusY },
        coverZoom: item.publishedCoverZoom,
        publishedAt: item.publishedAt ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(item.publishedAt) : null,
        publishedAtIso: item.publishedAt?.toISOString() ?? null,
      } };
    }) },
    { kind: "documents", label: "เอกสาร", total: documentCount, items: documents.map((item) => {
      const file = item.mediaId ? mediaById.get(item.mediaId) : undefined;
      const size = file ? file.sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB` : `${(file.sizeBytes / 1024 / 1024).toFixed(1)} MB` : "";
      return { id: item.id, title: item.title, description: preview(item.description, term), href: file ? documentFileUrl(item.id, item.title, file.mimeType) : "/documents", documentAction: file ? file.mimeType === "application/pdf" ? "open" as const : "download" as const : undefined, document: {
        file: file ? { name: file.name, mimeType: file.mimeType, size } : null,
        publishedAt: item.publishedAt ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(item.publishedAt) : null,
        downloadCount: item.downloadCount,
      } };
    }) },
    { kind: "units", label: "หน่วยงาน", total: matchingUnits.length, items: slice("units", matchingUnits) },
    { kind: "pages", label: "หน้าเว็บไซต์", total: matchingPages.length, items: slice("pages", matchingPages).map((item) => ({ id: item.id, title: item.name, description: preview(publishedText(item.publishedBlocks), term), href: item.path ? `/${item.path}` : "/" })) },
  ];
}

export const siteSearchPageSize = pageSize;
