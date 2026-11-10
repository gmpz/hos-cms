import "server-only";
import { randomUUID } from "node:crypto";
import { CmsPageStatus, PageAccessLevel, Prisma, type CmsPage } from "@prisma/client";
import { createInitialPage, hiddenPageHeader, initialPage, isDemoPage, type DemoPage, type PageHeaderSettings } from "@/features/pages/demo/model";
import { migrateDownloadsBlocks } from "@/features/pages/blocks/migrations/downloads";
import { migrateDocumentListBlocks } from "@/features/pages/blocks/migrations/document-list";
import { migrateGalleryBlocks } from "@/features/pages/blocks/migrations/gallery";
import { migratePdfViewerBlocks } from "@/features/pages/blocks/migrations/pdf-viewer";
import { migrateVideoBlocks } from "@/features/pages/blocks/migrations/video";
import { migrateBannerBlocks } from "@/features/pages/blocks/migrations/banner";
import { migrateMediaInteractionBlocks } from "@/features/pages/blocks/migrations/media-interaction";
import { migrateServiceGroupBlocks } from "@/features/pages/blocks/migrations/service-groups";
import { migrateNewsTabsBlocks } from "@/features/pages/blocks/migrations/news-tabs";
import { migrateDocumentBlocks } from "@/features/pages/blocks/migrations/documents";
import { migrateImageBlocks } from "@/features/pages/blocks/migrations/image";
import { migrateStatisticsBlocks } from "@/features/pages/blocks/migrations/statistics";
import { migrateLinkCardsBlocks } from "@/features/pages/blocks/migrations/link-cards";
import { migrateContactInfoBlocks } from "@/features/pages/blocks/migrations/contact-info";
import { migrateHeadingBlocks } from "@/features/pages/blocks/migrations/heading";
import { migrateDividerBlocks } from "@/features/pages/blocks/migrations/divider";
import { migrateTableBlocks } from "@/features/pages/blocks/migrations/table";
import type { DemoPageSummary } from "@/features/pages/demo/pages";
import { isReservedPagePath } from "@/features/pages/reserved-paths";
import type { AccessGrants } from "@/features/access/types";
import { emptyAccessGrants } from "@/features/access/types";
import { parseAccessGrants, replacePageGrants } from "@/server/access/repository";
import { prisma } from "@/server/database/prisma";

export class CmsPageError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function validPath(path: unknown): path is string {
  return typeof path === "string" && path.length <= 500 && /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(path) && !isReservedPagePath(path);
}

function validName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 300;
}

export function toSummary(row: CmsPage): DemoPageSummary {
  return {
    id: row.id, name: row.name, path: row.path,
    status: row.status === CmsPageStatus.PUBLISHED ? "published" : "draft",
    blocks: Array.isArray(row.draftBlocks) ? row.draftBlocks.length : 0,
    updatedAt: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(row.updatedAt),
    updatedBy: "ผู้ดูแลระบบ", revision: row.revision, locked: row.id === "home",
  };
}

export function toPageDocument(row: CmsPage, published = false): DemoPage | null {
  const rawBlocks = published ? row.publishedBlocks : row.draftBlocks;
  const rawHeader = published ? row.publishedHeader : row.draftHeader;
  const header = normalizePageHeader(rawHeader);
  const document: unknown = {
    id: row.id,
    title: row.name,
    header,
    blocks: Array.isArray(rawBlocks)
      ? migrateTableBlocks(migrateDividerBlocks(migrateHeadingBlocks(migrateContactInfoBlocks(migrateLinkCardsBlocks(migrateStatisticsBlocks(migrateImageBlocks(migrateDocumentBlocks(
          migrateNewsTabsBlocks(
            migrateServiceGroupBlocks(
              migrateBannerBlocks(
                migrateMediaInteractionBlocks(
                  migrateDocumentListBlocks(
                    migratePdfViewerBlocks(
                      migrateVideoBlocks(migrateGalleryBlocks(migrateDownloadsBlocks(rawBlocks))),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ))))))))
      : rawBlocks,
  };
  return isDemoPage(document) ? document : null;
}

function normalizePageHeader(value: unknown): PageHeaderSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...hiddenPageHeader };
  const candidate = value as Record<string, unknown>;
  const focalPoint = candidate.focalPoint && typeof candidate.focalPoint === "object" && !Array.isArray(candidate.focalPoint)
    ? candidate.focalPoint as Record<string, unknown>
    : {};
  return {
    mode: candidate.mode === "system" || candidate.mode === "custom" || candidate.mode === "hidden" ? candidate.mode : "hidden",
    eyebrow: typeof candidate.eyebrow === "string" ? candidate.eyebrow.slice(0, 100) : "หน้าเว็บไซต์",
    title: typeof candidate.title === "string" ? candidate.title.slice(0, 300) : "",
    description: typeof candidate.description === "string" ? candidate.description.slice(0, 500) : "",
    imageId: typeof candidate.imageId === "string" ? candidate.imageId : null,
    focalPoint: {
      x: typeof focalPoint.x === "number" && focalPoint.x >= 0 && focalPoint.x <= 100 ? focalPoint.x : 50,
      y: typeof focalPoint.y === "number" && focalPoint.y >= 0 && focalPoint.y <= 100 ? focalPoint.y : 50,
    },
  };
}

function pageHeaderJson(header: PageHeaderSettings): Prisma.InputJsonObject {
  return {
    mode: header.mode,
    eyebrow: header.eyebrow,
    title: header.title,
    description: header.description,
    imageId: header.imageId,
    focalPoint: { x: header.focalPoint.x, y: header.focalPoint.y },
  };
}

export async function ensureHomePage(): Promise<CmsPage> {
  return prisma.cmsPage.upsert({
    where: { id: "home" }, update: {},
    create: {
      id: "home", path: "", name: initialPage.title, status: CmsPageStatus.PUBLISHED,
      draftBlocks: initialPage.blocks as Prisma.InputJsonValue,
      publishedBlocks: initialPage.blocks as Prisma.InputJsonValue,
      draftHeader: pageHeaderJson(initialPage.header),
      publishedHeader: pageHeaderJson(initialPage.header),
      accessLevel: PageAccessLevel.PUBLIC,
    },
  });
}

export async function listCmsPages(): Promise<DemoPageSummary[]> {
  await ensureHomePage();
  const rows = await prisma.cmsPage.findMany({ where: { deletedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return rows.sort((left, right) => Number(right.id === "home") - Number(left.id === "home")).map(toSummary);
}

export async function listDeletedCmsPages(): Promise<DemoPageSummary[]> {
  return (await prisma.cmsPage.findMany({
    where: { deletedAt: { not: null } },
    orderBy: [{ deletedAt: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  })).map(toSummary);
}

export async function listPublishedCmsPages(): Promise<DemoPageSummary[]> {
  await ensureHomePage();
  return (await prisma.cmsPage.findMany({ where: { deletedAt: null, status: CmsPageStatus.PUBLISHED }, orderBy: { name: "asc" } })).map(toSummary);
}

export async function getCmsPageById(id: string): Promise<CmsPage | null> {
  if (id === "home") return ensureHomePage();
  return prisma.cmsPage.findFirst({ where: { id, deletedAt: null } });
}

export async function getCmsPageGrants(id: string): Promise<AccessGrants> {
  const rows = await prisma.pageAccessGrant.findMany({ where: { pageId: id }, select: { unitId: true, userId: true } });
  if (!rows.length) return emptyAccessGrants();
  return {
    unitIds: rows.flatMap((row) => row.unitId ? [row.unitId] : []),
    userIds: rows.flatMap((row) => row.userId ? [row.userId] : []),
  };
}

export async function getPublishedCmsPage(path: string): Promise<DemoPage | null> {
  if (!path) await ensureHomePage();
  const row = await prisma.cmsPage.findUnique({ where: { path } });
  return row && !row.deletedAt && row.status === CmsPageStatus.PUBLISHED ? toPageDocument(row, true) : null;
}

export async function createCmsPage(name: unknown, path: unknown, actorId: string): Promise<DemoPageSummary> {
  if (!validName(name) || !validPath(path)) throw new CmsPageError("ชื่อหรือ URL หน้าไม่ถูกต้อง");
  const id = randomUUID();
  const document = createInitialPage(id, name.trim());
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.cmsPage.create({ data: { id, name: name.trim(), path, draftBlocks: document.blocks as Prisma.InputJsonValue, draftHeader: pageHeaderJson(document.header) } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "page.create", entityType: "page", entityId: id, summary: `สร้างหน้า ${name.trim()}` } });
    return created;
  });
  return toSummary(row);
}

export async function saveCmsPageDocument(id: string, input: unknown, publish: boolean, accessLevel: unknown, accessGrants: unknown, revision: unknown, actorId: string): Promise<CmsPage> {
  if (!isDemoPage(input) || input.id !== id || !validName(input.title)) throw new CmsPageError("ข้อมูลหน้าเว็บไซต์ไม่ถูกต้อง");
  if (accessLevel !== "PUBLIC" && accessLevel !== "AUTHENTICATED" && accessLevel !== "CUSTOM") throw new CmsPageError("สิทธิ์การเข้าถึงไม่ถูกต้อง");
  const grants = accessLevel === "CUSTOM" ? parseAccessGrants(accessGrants) : emptyAccessGrants();
  if (accessLevel === "CUSTOM" && grants.unitIds.length + grants.userIds.length === 0) throw new CmsPageError("สิทธิ์แบบกำหนดเองต้องเลือกผู้ใช้หรือหน่วยงานอย่างน้อย 1 รายการ");
  if (!Number.isSafeInteger(revision) || typeof revision !== "number" || revision < 1) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
  if (JSON.stringify(input.blocks).length > 500_000) throw new CmsPageError("เนื้อหาหน้ามีขนาดใหญ่เกินไป");
  const document = input as DemoPage;
  return prisma.$transaction(async (tx) => {
    const row = await tx.cmsPage.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new CmsPageError("ไม่พบหน้าเว็บไซต์", 404);
    const changed = await tx.cmsPage.updateMany({ where: { id, revision, deletedAt: null }, data: {
      name: document.title.trim(), draftBlocks: document.blocks as Prisma.InputJsonValue, draftHeader: pageHeaderJson(document.header),
      accessLevel: id === "home" ? PageAccessLevel.PUBLIC : accessLevel,
      ...(publish ? { publishedBlocks: document.blocks as Prisma.InputJsonValue, publishedHeader: pageHeaderJson(document.header), status: CmsPageStatus.PUBLISHED, publishedAt: new Date() } : {}),
      revision: { increment: 1 },
    } });
    if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    await replacePageGrants(tx, id, id === "home" ? emptyAccessGrants() : grants);
    const saved = await tx.cmsPage.findUniqueOrThrow({ where: { id } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: publish ? "page.publish" : "page.save", entityType: "page", entityId: id, summary: `${publish ? "เผยแพร่" : "บันทึก"}หน้า ${document.title.trim()}` } });
    return saved;
  });
}

export async function discardCmsPageDraft(id: string, revision: unknown, actorId: string): Promise<CmsPage> {
  if (!Number.isSafeInteger(revision) || typeof revision !== "number" || revision < 1) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
  return prisma.$transaction(async (tx) => {
    const row = await tx.cmsPage.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new CmsPageError("ไม่พบหน้าเว็บไซต์", 404);
    if (row.status !== CmsPageStatus.PUBLISHED || !Array.isArray(row.publishedBlocks)) throw new CmsPageError("หน้านี้ยังไม่มีฉบับเผยแพร่ให้เรียกคืน");
    const changed = await tx.cmsPage.updateMany({
      where: { id, revision, deletedAt: null },
      data: {
        draftBlocks: row.publishedBlocks as Prisma.InputJsonValue,
        draftHeader: row.publishedHeader ?? Prisma.DbNull,
        revision: { increment: 1 },
      },
    });
    if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const restored = await tx.cmsPage.findUniqueOrThrow({ where: { id } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "page.discardDraft", entityType: "page", entityId: id, summary: `ยกเลิกร่างหน้า ${row.name}` } });
    return restored;
  });
}

export async function updateCmsPageMetadata(id: string, name: unknown, path: unknown, revision: unknown, actorId: string): Promise<DemoPageSummary> {
  if (!validName(name) || !validPath(path)) throw new CmsPageError("ชื่อหรือ URL หน้าไม่ถูกต้อง");
  if (!Number.isSafeInteger(revision) || typeof revision !== "number" || revision < 1) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
  const row = await prisma.$transaction(async (tx) => {
    const original = await tx.cmsPage.findFirst({ where: { id, deletedAt: null } });
    if (!original || id === "home") throw new CmsPageError("ไม่สามารถแก้หน้านี้ได้", 404);
    const changed = await tx.cmsPage.updateMany({ where: { id, revision, deletedAt: null }, data: { name: name.trim(), path, revision: { increment: 1 } } });
    if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const saved = await tx.cmsPage.findUniqueOrThrow({ where: { id } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "page.metadata", entityType: "page", entityId: id, summary: `แก้ชื่อหรือ URL หน้า ${name.trim()}` } });
    return saved;
  });
  return toSummary(row);
}

export async function actOnCmsPage(id: string, action: "duplicate" | "unpublish" | "delete" | "restore" | "purge", revision: unknown, actorId: string): Promise<DemoPageSummary | null> {
  const expectedRevision = typeof revision === "number" && Number.isSafeInteger(revision) && revision >= 1 ? revision : null;
  return prisma.$transaction(async (tx) => {
    const row = await tx.cmsPage.findFirst({ where: { id, deletedAt: action === "restore" || action === "purge" ? { not: null } : null } });
    if (!row) throw new CmsPageError("ไม่พบหน้าเว็บไซต์", 404);
    if (id === "home" && action !== "duplicate") throw new CmsPageError("หน้าแรกไม่สามารถลบหรือยกเลิกเผยแพร่ได้");
    let result: CmsPage | null = null;
    if (action === "duplicate") {
      const copyId = randomUUID();
      const copyPath = `${row.path || "home"}-copy-${copyId.slice(0, 8)}`;
      const document = toPageDocument(row);
      if (!document) throw new CmsPageError("ข้อมูลหน้าไม่ถูกต้อง");
      result = await tx.cmsPage.create({ data: { id: copyId, path: copyPath, name: `${row.name} (สำเนา)`.slice(0, 300), draftBlocks: document.blocks.map((block) => ({ ...block, id: randomUUID() })) as Prisma.InputJsonValue, draftHeader: pageHeaderJson(document.header) } });
    } else if (action === "unpublish") {
      if (expectedRevision === null) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
      const changed = await tx.cmsPage.updateMany({ where: { id, revision: expectedRevision, deletedAt: null }, data: { status: CmsPageStatus.DRAFT, publishedBlocks: Prisma.DbNull, publishedHeader: Prisma.DbNull, publishedAt: null, revision: { increment: 1 } } });
      if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
      result = await tx.cmsPage.findUniqueOrThrow({ where: { id } });
    } else if (action === "delete") {
      if (expectedRevision === null) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
      const changed = await tx.cmsPage.updateMany({ where: { id, revision: expectedRevision, deletedAt: null }, data: { deletedAt: new Date(), revision: { increment: 1 } } });
      if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    } else if (action === "restore") {
      if (expectedRevision === null) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
      const changed = await tx.cmsPage.updateMany({
        where: { id, revision: expectedRevision, deletedAt: { not: null } },
        data: { deletedAt: null, status: CmsPageStatus.DRAFT, publishedBlocks: Prisma.DbNull, publishedHeader: Prisma.DbNull, publishedAt: null, revision: { increment: 1 } },
      });
      if (!changed.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
      result = await tx.cmsPage.findUniqueOrThrow({ where: { id } });
    } else {
      if (expectedRevision === null) throw new CmsPageError("ข้อมูลหน้าไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
      const deleted = await tx.cmsPage.deleteMany({ where: { id, revision: expectedRevision, deletedAt: { not: null } } });
      if (!deleted.count) throw new CmsPageError("หน้าถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    }
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: `page.${action}`, entityType: "page", entityId: result?.id ?? id, summary: `${action === "duplicate" ? "ทำสำเนา" : action === "unpublish" ? "ยกเลิกเผยแพร่" : action === "restore" ? "กู้คืน" : action === "purge" ? "ลบถาวร" : "ลบ"}หน้า ${row.name}` } });
    return result ? toSummary(result) : null;
  });
}
