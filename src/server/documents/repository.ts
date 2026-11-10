import "server-only";

import { randomUUID } from "node:crypto";
import { CategoryScope, DocumentStatus, Prisma, type Document } from "@prisma/client";
import type { DemoDocument } from "@/features/documents/demo/model";
import { prisma } from "@/server/database/prisma";

export class DocumentInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, label: string, limit: number, required = false) {
  if (typeof value !== "string") throw new DocumentInputError(`${label}ไม่ถูกต้อง`);
  const result = value.trim();
  if (result.length > limit || (required && !result)) throw new DocumentInputError(`${label}ต้องมี 1–${limit} ตัวอักษร`);
  return result;
}

function dateLabel(value: Date | null): string | null {
  return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(value) : null;
}

function toDocumentDto(row: Document): DemoDocument {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.categoryId,
    unitId: row.unitId === "hospital" ? null : row.unitId,
    owner: row.owner,
    fiscalYear: row.fiscalYear,
    documentNumber: row.documentNumber,
    issuedOn: row.issuedOn ? row.issuedOn.toISOString().slice(0, 10) : "",
    mediaIds: row.mediaId ? [row.mediaId] : [],
    openCount: row.openCount,
    downloadCount: row.downloadCount,
    status: row.status === DocumentStatus.PUBLISHED ? "published" : row.status === DocumentStatus.ARCHIVED ? "archived" : "draft",
    publishedAt: dateLabel(row.publishedAt),
    deletedAt: dateLabel(row.deletedAt),
    updatedAt: dateLabel(row.updatedAt) ?? "",
  };
}

export async function listDocuments(includeDrafts: boolean): Promise<DemoDocument[]> {
  const rows = await prisma.document.findMany({
    where: includeDrafts ? { deletedAt: null } : { status: DocumentStatus.PUBLISHED, deletedAt: null },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(toDocumentDto);
}

export async function listDeletedDocuments(): Promise<DemoDocument[]> {
  const rows = await prisma.document.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return rows.map(toDocumentDto);
}

export type DocumentListQuery = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string | null;
  status: DocumentStatus | null;
  fiscalYear: number | null;
  trash: boolean;
};

export async function listDocumentPage(query: DocumentListQuery) {
  const search = query.search.trim();
  const where: Prisma.DocumentWhereInput = {
    deletedAt: query.trash ? { not: null } : null,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.fiscalYear ? { fiscalYear: query.fiscalYear } : {}),
    ...(!query.trash && query.status ? { status: query.status } : {}),
    ...(search ? { OR: [
      { title: { contains: search } },
      { documentNumber: { contains: search } },
      { owner: { contains: search } },
    ] } : {}),
  };
  const [total, activeTotal, publishedTotal, draftTotal, trashTotal, years] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null, status: DocumentStatus.PUBLISHED } }),
    prisma.document.count({ where: { deletedAt: null, status: DocumentStatus.DRAFT } }),
    prisma.document.count({ where: { deletedAt: { not: null } } }),
    prisma.document.groupBy({ by: ["fiscalYear"], where: { deletedAt: query.trash ? { not: null } : null }, orderBy: { fiscalYear: "desc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const rows = await prisma.document.findMany({
    where,
    orderBy: query.trash ? [{ deletedAt: "desc" }, { id: "asc" }] : [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return { items: rows.map(toDocumentDto), page, pageSize: query.pageSize, total, years: years.map((item) => item.fiscalYear), counts: { active: activeTotal, published: publishedTotal, draft: draftTotal, trash: trashTotal } };
}

export type PublicDocumentListQuery = {
  page: number;
  pageSize: number;
  search: string;
  categoryId: string | null;
  unitId: string | null;
  fiscalYear: number | "latest" | null;
};

export async function listPublicDocumentPage(query: PublicDocumentListQuery) {
  const baseWhere: Prisma.DocumentWhereInput = {
    status: DocumentStatus.PUBLISHED,
    deletedAt: null,
    ...(query.unitId ? { unitId: query.unitId } : {}),
  };
  const years = await prisma.document.groupBy({ by: ["fiscalYear"], where: baseWhere, orderBy: { fiscalYear: "desc" } });
  const yearOptions = years.map((item) => item.fiscalYear);
  const selectedYear = query.fiscalYear === "latest" ? yearOptions[0] ?? null : query.fiscalYear;
  const yearWhere: Prisma.DocumentWhereInput = { ...baseWhere, ...(selectedYear ? { fiscalYear: selectedYear } : {}) };
  const search = query.search.trim();
  const where: Prisma.DocumentWhereInput = {
    ...yearWhere,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(search ? { OR: [
      { title: { contains: search } },
      { description: { contains: search } },
      { documentNumber: { contains: search } },
      { owner: { contains: search } },
    ] } : {}),
  };
  const [total, categoryGroups] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.groupBy({ by: ["categoryId"], where: yearWhere, _count: { _all: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const rows = await prisma.document.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  return { items: rows.map(toDocumentDto), page, pageSize: query.pageSize, total, years: yearOptions, selectedYear, categoryCounts: Object.fromEntries(categoryGroups.map((item) => [item.categoryId, item._count._all])) };
}

export async function actOnDocument(id: string, action: "unpublish" | "delete" | "restore"): Promise<DemoDocument> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DocumentInputError("รหัสเอกสารไม่ถูกต้อง");
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new DocumentInputError("ไม่พบเอกสาร", 404);
  if (action === "restore") {
    if (!existing.deletedAt) throw new DocumentInputError("เอกสารไม่ได้อยู่ในถังขยะ", 409);
    return toDocumentDto(await prisma.document.update({ where: { id }, data: { deletedAt: null, status: DocumentStatus.DRAFT, publishedAt: null } }));
  }
  if (existing.deletedAt) throw new DocumentInputError("เอกสารอยู่ในถังขยะแล้ว", 409);
  if (action === "unpublish") {
    if (existing.status !== DocumentStatus.PUBLISHED) throw new DocumentInputError("เอกสารนี้ไม่ได้เผยแพร่", 409);
    return toDocumentDto(await prisma.document.update({ where: { id }, data: { status: DocumentStatus.DRAFT, publishedAt: null } }));
  }
  return toDocumentDto(await prisma.document.update({ where: { id }, data: { deletedAt: new Date(), status: DocumentStatus.DRAFT, publishedAt: null } }));
}

export async function saveDocument(input: unknown): Promise<DemoDocument> {
  if (!record(input)) throw new DocumentInputError("ข้อมูลเอกสารไม่ถูกต้อง");
  const title = stringField(input.title, "ชื่อเอกสาร", 300, true);
  const description = stringField(input.description, "คำอธิบาย", 5000);
  const categoryId = stringField(input.categoryId, "หมวดหมู่", 36, true);
  const unitId = input.unitId === null ? "hospital" : stringField(input.unitId, "เจ้าของเอกสาร", 100, true);
  const documentNumber = stringField(input.documentNumber, "เลขที่เอกสาร", 160);
  const fiscalYear = input.fiscalYear;
  if (typeof fiscalYear !== "number" || !Number.isInteger(fiscalYear) || fiscalYear < 2400 || fiscalYear > 2800)
    throw new DocumentInputError("ปีงบประมาณไม่ถูกต้อง");
  const mediaIds = input.mediaIds;
  if (!Array.isArray(mediaIds) || mediaIds.length > 1 || !mediaIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 191))
    throw new DocumentInputError("เลือกไฟล์ได้หนึ่งไฟล์ต่อเอกสาร");
  const mediaId: string | null = mediaIds[0] ?? null;
  const status = input.status === "published" ? DocumentStatus.PUBLISHED : input.status === "archived" ? DocumentStatus.ARCHIVED : input.status === "draft" ? DocumentStatus.DRAFT : null;
  if (!status) throw new DocumentInputError("สถานะเอกสารไม่ถูกต้อง");
  if (status === DocumentStatus.PUBLISHED && !mediaId) throw new DocumentInputError("เอกสารที่เผยแพร่ต้องมีไฟล์");
  let issuedOn: Date | null = null;
  if (input.issuedOn !== "") {
    if (typeof input.issuedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.issuedOn)) throw new DocumentInputError("วันที่เอกสารไม่ถูกต้อง");
    issuedOn = new Date(`${input.issuedOn}T00:00:00.000Z`);
    if (Number.isNaN(issuedOn.getTime()) || issuedOn.toISOString().slice(0, 10) !== input.issuedOn) throw new DocumentInputError("วันที่เอกสารไม่ถูกต้อง");
  }
  const [category, unit] = await Promise.all([
    prisma.category.findFirst({ where: { id: categoryId, scope: CategoryScope.DOCUMENTS, active: true }, select: { id: true } }),
    prisma.unit.findUnique({ where: { id: unitId }, select: { name: true } }),
  ]);
  if (!category) throw new DocumentInputError("ไม่พบหมวดหมู่เอกสารที่เปิดใช้งาน");
  if (!unit) throw new DocumentInputError("ไม่พบเจ้าของเอกสาร");
  const data = { title, description, categoryId, unitId, owner: unit.name, fiscalYear, documentNumber, issuedOn, mediaId, status };
  const id = input.id;
  if (typeof id !== "string") throw new DocumentInputError("รหัสเอกสารไม่ถูกต้อง");
  if (id === "new-document" || /^[0-9a-f-]{36}$/i.test(id) && !await prisma.document.findUnique({ where: { id }, select: { id: true } })) {
    return toDocumentDto(await prisma.document.create({ data: { ...data, id: randomUUID(), publishedAt: status === DocumentStatus.PUBLISHED ? new Date() : null } }));
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DocumentInputError("รหัสเอกสารไม่ถูกต้อง");
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new DocumentInputError("ไม่พบเอกสาร", 404);
  if (existing.deletedAt) throw new DocumentInputError("เอกสารอยู่ในถังขยะ กรุณากู้คืนก่อนแก้ไข", 409);
  return toDocumentDto(await prisma.document.update({ where: { id }, data: { ...data, publishedAt: status === DocumentStatus.PUBLISHED ? existing.publishedAt ?? new Date() : null } }));
}
