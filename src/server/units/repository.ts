import "server-only";
import { PageAccessLevel, Prisma, UnitStatus, type Unit } from "@prisma/client";
import type { DemoUnit, UnitPersonnel } from "@/features/units/demo/model";
import type { AuthUser } from "@/server/auth/session";
import { emptyAccessGrants } from "@/features/access/types";
import { parseAccessGrants, replaceUnitGrants } from "@/server/access/repository";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";
import { isValidPhone, isValidPhoneExtension, phoneDigits } from "@/features/users/phone";

export class UnitInputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const unitSnapshotKeys = ["name", "shortName", "summary", "coverMediaId", "coverFocus", "about", "vision", "mission", "visionStatement", "missionItems", "services", "personnel", "contact", "sectionOrder", "sectionVisibility", "sectionBackground"] as const;
function snapshotChanged(draft: Record<string, unknown>, published: unknown): boolean {
  const live = published && typeof published === "object" && !Array.isArray(published) ? published as Record<string, unknown> : {};
  return unitSnapshotKeys.some((key) => JSON.stringify(draft[key] ?? null) !== JSON.stringify(live[key] ?? null));
}
function idsChanged(a: string[], b: string[]): boolean {
  return JSON.stringify([...a].sort()) !== JSON.stringify([...b].sort());
}

function toDto(row: Unit, published = false): DemoUnit {
  const payload = (published ? row.publishedPayload : row.payload) as Partial<DemoUnit>;
  return {
    ...payload,
    id: row.id,
    slug: published ? row.publishedSlug ?? row.slug : row.slug,
    name: published ? payload.name ?? row.name : row.name,
    shortName: published ? payload.shortName ?? row.shortName : row.shortName,
    sortOrder: row.sortOrder,
    coverImageUrl: null,
    coverFocus: payload.coverFocus ?? { x: 50, y: 50 },
    status: row.status === UnitStatus.PUBLISHED ? "published" : "draft",
    accessLevel: published ? row.publishedAccessLevel ?? row.accessLevel : row.accessLevel,
    accessGrants: published ? emptyAccessGrants() : parseAccessGrants(row.draftAccessGrants),
    personnel: Array.isArray(payload.personnel) ? payload.personnel.map((person) => ({ ...person, userId: person.userId ?? null, phoneExtension: person.phoneExtension ?? "" })) : [],
    updatedAt: new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(published ? row.publishedAt ?? row.updatedAt : row.updatedAt),
    hasUnpublishedChanges: published ? false : row.hasUnpublishedChanges,
    publishedSlug: row.publishedSlug,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  } as DemoUnit;
}

async function hydrateCoverImages(units: DemoUnit[]): Promise<DemoUnit[]> {
  const mediaIds = [...new Set(units.flatMap((unit) => unit.coverMediaId ? [unit.coverMediaId] : []))];
  if (!mediaIds.length) return units;
  const media = await prisma.mediaAsset.findMany({ where: { id: { in: mediaIds }, kind: "IMAGE" }, select: { id: true, fileName: true } });
  const urls = new Map(media.map((item) => [item.id, mediaPublicUrl(item.fileName)]));
  return units.map((unit) => ({ ...unit, coverImageUrl: unit.coverMediaId ? urls.get(unit.coverMediaId) ?? null : null }));
}

async function hydratePersonnelProfiles(units: DemoUnit[], includePrivate: boolean): Promise<DemoUnit[]> {
  const userIds = [...new Set(units.flatMap((unit) => unit.personnel.flatMap((person) => person.userId ? [person.userId] : [])))];
  if (!userIds.length) return units;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, status: "ACTIVE" },
    select: { id: true, displayName: true, phone: true, phoneExtension: true, email: true, publishPhone: true, publishEmail: true, profileMediaId: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true, position: { select: { name: true } }, level: { select: { name: true } } },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return units.map((unit) => ({ ...unit, personnel: unit.personnel.flatMap((person) => {
    if (!person.userId) return person;
    const profile = byId.get(person.userId);
    if (!profile) return includePrivate ? [person] : [];
    return [{
      ...person,
      name: profile.displayName,
      position: profile.position?.name ?? "",
      level: profile.level?.name ?? "",
      phone: includePrivate || profile.publishPhone ? profile.phone : "",
      phoneExtension: includePrivate || profile.publishPhone ? profile.phoneExtension : "",
      email: includePrivate || profile.publishEmail ? profile.email : "",
      mediaId: profile.profileMediaId,
      photoFocus: { x: profile.profilePhotoFocusX, y: profile.profilePhotoFocusY, zoom: profile.profilePhotoZoom },
    }];
  }) }));
}

export async function listUnits(includeDrafts: boolean, user: AuthUser | null = null, includeDeleted = false): Promise<DemoUnit[]> {
  const unrestricted = includeDrafts || user?.role === "ADMIN";
  const rows = await prisma.unit.findMany({
    where: {
      id: { not: "hospital" },
      deletedAt: includeDrafts && includeDeleted ? { not: null } : null,
      ...(includeDrafts ? {} : { status: UnitStatus.PUBLISHED, publishedSlug: { not: null }, publishedPayload: { not: Prisma.DbNull } }),
      ...(unrestricted ? {} : { OR: [
        { publishedAccessLevel: PageAccessLevel.PUBLIC },
        ...(user && !user.mustChangePassword ? [
          { publishedAccessLevel: PageAccessLevel.AUTHENTICATED },
          { publishedAccessLevel: PageAccessLevel.CUSTOM, landingAccessGrants: { some: { OR: [
            { userId: user.id },
            { unit: { userMemberships: { some: { userId: user.id } } } },
          ] } } },
        ] : []),
      ] }),
    },
    orderBy: includeDrafts && includeDeleted ? [{ deletedAt: "desc" }, { name: "asc" }] : [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const units = await hydrateCoverImages(await hydratePersonnelProfiles(rows.map((row) => toDto(row, !includeDrafts)), includeDrafts));
  return units;
}

function publicUnitWhere(user: AuthUser | null): Prisma.UnitWhereInput {
  return {
    id: { not: "hospital" }, deletedAt: null, status: UnitStatus.PUBLISHED,
    publishedSlug: { not: null }, publishedPayload: { not: Prisma.DbNull },
    ...(user?.role === "ADMIN" ? {} : { OR: [
      { publishedAccessLevel: PageAccessLevel.PUBLIC },
      ...(user && !user.mustChangePassword ? [
        { publishedAccessLevel: PageAccessLevel.AUTHENTICATED },
        { publishedAccessLevel: PageAccessLevel.CUSTOM, landingAccessGrants: { some: { OR: [
          { userId: user.id },
          { unit: { userMemberships: { some: { userId: user.id } } } },
        ] } } },
      ] : []),
    ] }),
  };
}

export async function listPublicUnitPage(query: { page: number; pageSize: number; search: string }, user: AuthUser | null) {
  const search = query.search.trim();
  const where: Prisma.UnitWhereInput = { AND: [publicUnitWhere(user),
    ...(search ? [{ OR: [
      { publishedPayload: { path: "$.name", string_contains: search } },
      { publishedPayload: { path: "$.shortName", string_contains: search } },
      { publishedSlug: { contains: search } },
    ] }] : []),
  ],
  };
  const total = await prisma.unit.count({ where });
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await prisma.unit.findMany({ where, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip: (page - 1) * query.pageSize, take: query.pageSize });
  const items = await hydrateCoverImages(await hydratePersonnelProfiles(rows.map((row) => toDto(row, true)), false));
  return { items: items.map((unit) => ({ id: unit.id, slug: unit.slug, name: unit.name, coverImageUrl: unit.coverImageUrl, coverFocus: unit.coverFocus, personnelCount: unit.personnel.length })), page, pageSize: query.pageSize, total };
}

export async function getPublicUnitBySlug(slug: string, user: AuthUser | null): Promise<DemoUnit | null> {
  const row = await prisma.unit.findFirst({ where: { ...publicUnitWhere(user), publishedSlug: slug } });
  if (!row) return null;
  const [unit] = await hydrateCoverImages(await hydratePersonnelProfiles([toDto(row, true)], false));
  return unit;
}

export async function getPublicUnitTitleBySlug(slug: string, user: AuthUser | null): Promise<string | null> {
  const row = await prisma.unit.findFirst({ where: { ...publicUnitWhere(user), publishedSlug: slug }, select: { publishedPayload: true, name: true } });
  const payload = row?.publishedPayload;
  return payload && typeof payload === "object" && !Array.isArray(payload) && typeof payload.name === "string" ? payload.name : row?.name ?? null;
}

export async function listPublicPersonnel(query: { unitId: string | null; limit: number }, user: AuthUser | null): Promise<Array<UnitPersonnel & { unitName: string }>> {
  const where: Prisma.UnitWhereInput = { AND: [publicUnitWhere(user), ...(query.unitId ? [{ id: query.unitId }] : [])] };
  const people: Array<UnitPersonnel & { unitName: string }> = [];
  let cursor: string | undefined;
  const batchSize = query.unitId ? 1 : 20;
  while (people.length < query.limit) {
    const rows = await prisma.unit.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!rows.length) break;
    const units = await hydratePersonnelProfiles(rows.map((row) => toDto(row, true)), false);
    for (const unit of units) {
      for (const person of unit.personnel) {
        people.push({ ...person, unitName: unit.shortName || unit.name });
        if (people.length === query.limit) return people;
      }
    }
    if (query.unitId || rows.length < batchSize) break;
    cursor = rows.at(-1)!.id;
  }
  return people;
}

export async function listAdminUnitPage(query: { page: number; pageSize: number; search: string; status: "all" | "published" | "draft" | "trash" }) {
  const trash = query.status === "trash";
  const where: Prisma.UnitWhereInput = {
    id: { not: "hospital" },
    deletedAt: trash ? { not: null } : null,
    ...(query.status === "published" ? { status: UnitStatus.PUBLISHED } : query.status === "draft" ? { status: UnitStatus.DRAFT } : {}),
    ...(query.search.trim() ? { name: { contains: query.search.trim() } } : {}),
  };
  const [total, active, published, draft, deleted] = await Promise.all([
    prisma.unit.count({ where }),
    prisma.unit.count({ where: { id: { not: "hospital" }, deletedAt: null } }),
    prisma.unit.count({ where: { id: { not: "hospital" }, deletedAt: null, status: UnitStatus.PUBLISHED } }),
    prisma.unit.count({ where: { id: { not: "hospital" }, deletedAt: null, status: UnitStatus.DRAFT } }),
    prisma.unit.count({ where: { id: { not: "hospital" }, deletedAt: { not: null } } }),
  ]);
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await prisma.unit.findMany({
    where,
    orderBy: trash ? [{ deletedAt: "desc" }, { name: "asc" }] : [{ sortOrder: "asc" }, { name: "asc" }],
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
  });
  const items = await hydrateCoverImages(rows.map((row) => toDto(row)));
  return { items, page, pageSize: query.pageSize, total, counts: { active, published, draft, trash: deleted } };
}

export async function moveAdminUnit(id: string, direction: "up" | "down"): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.unit.findMany({ where: { id: { not: "hospital" }, deletedAt: null }, select: { id: true, sortOrder: true, name: true, updatedAt: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    const index = rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) throw new UnitInputError("ไม่สามารถเลื่อนลำดับหน่วยงาน", 409);
    [rows[index], rows[target]] = [rows[target], rows[index]];
    await Promise.all(rows.map((row, sortOrder) => row.sortOrder === sortOrder ? Promise.resolve() : tx.unit.update({ where: { id: row.id }, data: { sortOrder, updatedAt: row.updatedAt } })));
  });
}

export async function reorderUnits(ids: string[]): Promise<void> {
  if (!ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id)) || new Set(ids).size !== ids.length)
    throw new UnitInputError("ลำดับหน่วยงานไม่ถูกต้อง");
  await prisma.$transaction(async (tx) => {
    const current = await tx.unit.findMany({ where: { id: { not: "hospital" }, deletedAt: null }, select: { id: true, updatedAt: true } });
    if (current.length !== ids.length || current.some((unit) => !ids.includes(unit.id)))
      throw new UnitInputError("รายการหน่วยงานเปลี่ยนไป กรุณาโหลดหน้าใหม่", 409);
    const byId = new Map(current.map((unit) => [unit.id, unit]));
    await Promise.all(ids.map((id, sortOrder) => tx.unit.update({ where: { id }, data: { sortOrder, updatedAt: byId.get(id)!.updatedAt } })));
  });
}

export async function getUnitAccessBySlug(slug: string): Promise<PageAccessLevel | null> {
  const unit = await prisma.unit.findUnique({ where: { publishedSlug: slug }, select: { status: true, publishedAccessLevel: true, deletedAt: true } });
  return unit?.status === UnitStatus.PUBLISHED && !unit.deletedAt ? unit.publishedAccessLevel : null;
}

export async function getPublishedUnitSnapshot(id: string): Promise<DemoUnit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") return null;
  const row = await prisma.unit.findUnique({
    where: { id },
    include: { landingAccessGrants: { select: { unitId: true, userId: true } } },
  });
  if (!row?.publishedPayload || !row.publishedSlug || row.deletedAt) return null;
  const snapshot = toDto(row, true);
  snapshot.status = "published";
  snapshot.accessGrants = {
    unitIds: row.landingAccessGrants.flatMap((grant) => grant.unitId ? [grant.unitId] : []),
    userIds: row.landingAccessGrants.flatMap((grant) => grant.userId ? [grant.userId] : []),
  };
  return (await hydrateCoverImages(await hydratePersonnelProfiles([snapshot], true)))[0];
}

export async function unpublishUnit(id: string): Promise<DemoUnit> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  const result = await prisma.unit.updateMany({
    where: { id, status: UnitStatus.PUBLISHED, deletedAt: null },
    data: { status: UnitStatus.DRAFT, hasUnpublishedChanges: false },
  });
  if (!result.count) throw new UnitInputError("ไม่พบกลุ่มงานที่เผยแพร่", 404);
  const row = await prisma.unit.findUniqueOrThrow({ where: { id } });
  return (await hydrateCoverImages(await hydratePersonnelProfiles([toDto(row)], true)))[0];
}

export async function deleteUnit(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  const unit = await prisma.unit.findUnique({
    where: { id },
    select: {
      name: true,
      deletedAt: true,
      _count: { select: { posts: true, documents: true, pageAccessGrants: true, grantedLandingAccess: true } },
    },
  });
  if (!unit) throw new UnitInputError("ไม่พบกลุ่มงาน", 404);
  if (unit.deletedAt) throw new UnitInputError("กลุ่มงานอยู่ในถังขยะแล้ว", 409);
  if (unit._count.posts || unit._count.documents)
    throw new UnitInputError(`ลบ “${unit.name}” ไม่ได้ เนื่องจากยังมีข่าวหรือเอกสารอยู่ กรุณาย้ายเนื้อหาก่อน`, 409);
  if (unit._count.pageAccessGrants || unit._count.grantedLandingAccess)
    throw new UnitInputError(`ลบ “${unit.name}” ไม่ได้ เนื่องจากยังถูกใช้กำหนดสิทธิ์การเข้าถึง`, 409);
  await prisma.unit.update({ where: { id }, data: { deletedAt: new Date(), status: UnitStatus.DRAFT, hasUnpublishedChanges: false } });
}

export async function restoreUnit(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  await prisma.$transaction(async (tx) => {
    const last = await tx.unit.aggregate({ where: { id: { not: "hospital" }, deletedAt: null }, _max: { sortOrder: true } });
    const result = await tx.unit.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null, status: UnitStatus.DRAFT, hasUnpublishedChanges: false, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    if (!result.count) throw new UnitInputError("ไม่พบกลุ่มงานในถังขยะ", 404);
  });
}

export async function purgeUnit(id: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  await prisma.$transaction(async (tx) => {
    const unit = await tx.unit.findUnique({
      where: { id },
      select: {
        name: true,
        deletedAt: true,
        _count: { select: { posts: true, documents: true, pageAccessGrants: true, grantedLandingAccess: true } },
      },
    });
    if (!unit?.deletedAt) throw new UnitInputError("ไม่พบกลุ่มงานในถังขยะ", 404);
    if (unit._count.posts || unit._count.documents)
      throw new UnitInputError(`ลบ “${unit.name}” ถาวรไม่ได้ เนื่องจากยังมีข่าวหรือเอกสารอยู่`, 409);
    if (unit._count.pageAccessGrants || unit._count.grantedLandingAccess)
      throw new UnitInputError(`ลบ “${unit.name}” ถาวรไม่ได้ เนื่องจากยังถูกใช้กำหนดสิทธิ์การเข้าถึง`, 409);
    const result = await tx.unit.deleteMany({ where: { id, deletedAt: { not: null } } });
    if (!result.count) throw new UnitInputError("กลุ่มงานเปลี่ยนแปลงไป กรุณาโหลดหน้าใหม่", 409);
  });
}

export async function discardUnitDraft(id: string): Promise<DemoUnit> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  const row = await prisma.$transaction(async (tx) => {
    const current = await tx.unit.findUnique({
      where: { id },
      include: { landingAccessGrants: { select: { unitId: true, userId: true } } },
    });
    if (!current || current.id === "hospital" || current.deletedAt || current.status !== UnitStatus.PUBLISHED || !current.publishedPayload || !current.publishedSlug || !current.publishedAccessLevel || !current.hasUnpublishedChanges)
      throw new UnitInputError("ไม่พบฉบับร่างที่รอยกเลิก", 404);
    const published = current.publishedPayload as Partial<DemoUnit>;
    const grants = {
      unitIds: current.landingAccessGrants.flatMap((grant) => grant.unitId ? [grant.unitId] : []),
      userIds: current.landingAccessGrants.flatMap((grant) => grant.userId ? [grant.userId] : []),
    };
    return tx.unit.update({
      where: { id },
      data: {
        name: published.name ?? current.name,
        shortName: published.shortName ?? current.shortName,
        slug: current.publishedSlug,
        accessLevel: current.publishedAccessLevel,
        payload: current.publishedPayload as Prisma.InputJsonObject,
        draftAccessGrants: grants as Prisma.InputJsonObject,
        hasUnpublishedChanges: false,
      },
    });
  });
  return (await hydrateCoverImages(await hydratePersonnelProfiles([toDto(row)], true)))[0];
}

export async function saveUnit(input: unknown, publish: boolean): Promise<DemoUnit> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw new UnitInputError("ข้อมูลกลุ่มงานไม่ถูกต้อง");
  const value = input as Record<string, unknown>;
  const id = value.id;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const shortName = typeof value.shortName === "string" ? value.shortName.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || id === "hospital") throw new UnitInputError("รหัสกลุ่มงานไม่ถูกต้อง");
  if (!name || name.length > 160 || shortName.length > 160) throw new UnitInputError("ชื่อกลุ่มงานไม่ถูกต้อง");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 191 || slug === "hospital") throw new UnitInputError("URL กลุ่มงานไม่ถูกต้อง");
  if (value.status !== "draft" && value.status !== "published") throw new UnitInputError("สถานะกลุ่มงานไม่ถูกต้อง");
  if (value.accessLevel !== "PUBLIC" && value.accessLevel !== "AUTHENTICATED" && value.accessLevel !== "CUSTOM") throw new UnitInputError("สิทธิ์การเข้าถึงไม่ถูกต้อง");
  const coverFocus = value.coverFocus as Record<string, unknown> | undefined;
  if (coverFocus && (typeof coverFocus !== "object" || Array.isArray(coverFocus) ||
    typeof coverFocus.x !== "number" || !Number.isFinite(coverFocus.x) || coverFocus.x < 0 || coverFocus.x > 100 ||
    typeof coverFocus.y !== "number" || !Number.isFinite(coverFocus.y) || coverFocus.y < 0 || coverFocus.y > 100 ||
    (coverFocus.zoom !== undefined && (typeof coverFocus.zoom !== "number" || !Number.isFinite(coverFocus.zoom) || coverFocus.zoom < 1 || coverFocus.zoom > 2))))
    throw new UnitInputError("ตำแหน่งหรือระดับซูมภาพหน้าปกไม่ถูกต้อง");
  const grants = value.accessLevel === "CUSTOM" ? parseAccessGrants(value.accessGrants) : emptyAccessGrants();
  if (value.accessLevel === "CUSTOM" && grants.unitIds.length + grants.userIds.length === 0) throw new UnitInputError("สิทธิ์แบบกำหนดเองต้องเลือกผู้ใช้หรือหน่วยงานอย่างน้อย 1 รายการ");
  if (value.visionStatement !== undefined && (typeof value.visionStatement !== "string" || value.visionStatement.trim().length > 220))
    throw new UnitInputError("วิสัยทัศน์ต้องไม่เกิน 220 ตัวอักษร");
  if (value.missionItems !== undefined) {
    if (!Array.isArray(value.missionItems) || value.missionItems.length > 6) throw new UnitInputError("พันธกิจต้องมีไม่เกิน 6 ข้อ");
    const seen = new Set<string>();
    for (const item of value.missionItems) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new UnitInputError("ข้อมูลพันธกิจไม่ถูกต้อง");
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== "string" || !/^[0-9a-f-]{36}$/i.test(entry.id) || seen.has(entry.id) ||
          typeof entry.title !== "string" || (publish && !entry.title.trim()) || entry.title.trim().length > 40 ||
          typeof entry.description !== "string" || (publish && !entry.description.trim()) || entry.description.trim().length > 120)
        throw new UnitInputError("พันธกิจแต่ละข้อต้องมีหัวข้อไม่เกิน 40 ตัวอักษร และคำอธิบายไม่เกิน 120 ตัวอักษร");
      seen.add(entry.id);
    }
  }
  const linkedUserIds = [...new Set((Array.isArray(value.personnel) ? value.personnel : []).flatMap((person) => {
    if (typeof person !== "object" || person === null || Array.isArray(person)) return [];
    const userId = (person as Record<string, unknown>).userId;
    if (userId === null || userId === undefined) return [];
    if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) throw new UnitInputError("ข้อมูลบุคลากรที่เชื่อมกับบัญชีไม่ถูกต้อง");
    return [userId];
  }))];
  const personnel = (Array.isArray(value.personnel) ? value.personnel : []).map((person) => {
    if (typeof person !== "object" || person === null || Array.isArray(person)) throw new UnitInputError("ข้อมูลบุคลากรไม่ถูกต้อง");
    const entry = person as Record<string, unknown>;
    const phone = phoneDigits(typeof entry.phone === "string" ? entry.phone : "");
    const phoneExtension = phoneDigits(typeof entry.phoneExtension === "string" ? entry.phoneExtension : "", 6);
    if (!isValidPhone(phone) || !isValidPhoneExtension(phoneExtension) || (phoneExtension && !phone)) throw new UnitInputError("เบอร์โทรศัพท์บุคลากรไม่ถูกต้อง");
    if (!entry.userId && entry.level !== undefined && (typeof entry.level !== "string" || entry.level.trim().length > 160)) throw new UnitInputError("ระดับบุคลากรไม่ถูกต้อง");
    const normalized: Record<string, unknown> = { ...entry, phone, phoneExtension };
    if (entry.userId) delete normalized.level;
    else normalized.level = typeof entry.level === "string" ? entry.level.trim() : "";
    return normalized;
  });
  if (linkedUserIds.length && await prisma.user.count({ where: { id: { in: linkedUserIds }, status: "ACTIVE" } }) !== linkedUserIds.length) throw new UnitInputError("ไม่พบบัญชีบุคลากรที่เลือกหรือบัญชีถูกปิดใช้งาน");
  if (linkedUserIds.length && await prisma.userUnit.count({ where: { userId: { in: linkedUserIds }, unitId: id } }) !== linkedUserIds.length) throw new UnitInputError("บุคลากรที่เลือกไม่ได้สังกัดอยู่ในกลุ่มงานนี้");
  const storedValue: Record<string, unknown> = { ...value, personnel };
  delete storedValue.accessGrants;
  delete storedValue.coverImageUrl;
  delete storedValue.sortOrder;
  const payload = JSON.stringify(storedValue);
  if (payload.length > 500_000) throw new UnitInputError("ข้อมูลกลุ่มงานมีขนาดใหญ่เกินไป");
  const row = await prisma.$transaction(async (tx) => {
    const existing = await tx.unit.findUnique({ where: { id }, select: { status: true, deletedAt: true, publishedPayload: true, publishedSlug: true, publishedAccessLevel: true, sortOrder: true, landingAccessGrants: { select: { unitId: true, userId: true } } } });
    if (existing?.deletedAt) throw new UnitInputError("กลุ่มงานอยู่ในถังขยะ กรุณากู้คืนก่อนแก้ไข", 409);
    const nextSortOrder = existing?.sortOrder ?? ((await tx.unit.aggregate({ where: { id: { not: "hospital" }, deletedAt: null }, _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;
    const liveUnitIds = existing?.landingAccessGrants.flatMap((grant) => grant.unitId ? [grant.unitId] : []) ?? [];
    const liveUserIds = existing?.landingAccessGrants.flatMap((grant) => grant.userId ? [grant.userId] : []) ?? [];
    const hasUnpublishedChanges = !publish && existing?.status === UnitStatus.PUBLISHED && (
      snapshotChanged(storedValue, existing.publishedPayload) ||
      slug !== existing.publishedSlug ||
      value.accessLevel !== existing.publishedAccessLevel ||
      idsChanged(grants.unitIds, liveUnitIds) || idsChanged(grants.userIds, liveUserIds)
    );
    const saved = await tx.unit.upsert({
      where: { id },
      create: { id, name, shortName, slug, sortOrder: nextSortOrder, status: publish ? UnitStatus.PUBLISHED : UnitStatus.DRAFT, accessLevel: value.accessLevel as PageAccessLevel, payload: storedValue as Prisma.InputJsonObject, draftAccessGrants: grants as Prisma.InputJsonObject,
        ...(publish ? { publishedPayload: storedValue as Prisma.InputJsonObject, publishedSlug: slug, publishedAccessLevel: value.accessLevel as PageAccessLevel, publishedAt: new Date() } : {}),
      },
      update: { name, shortName, slug, status: publish ? UnitStatus.PUBLISHED : existing?.status ?? UnitStatus.DRAFT, accessLevel: value.accessLevel as PageAccessLevel, payload: storedValue as Prisma.InputJsonObject, draftAccessGrants: grants as Prisma.InputJsonObject,
        hasUnpublishedChanges,
        ...(publish ? { publishedPayload: storedValue as Prisma.InputJsonObject, publishedSlug: slug, publishedAccessLevel: value.accessLevel as PageAccessLevel, publishedAt: new Date() } : {}),
      },
    });
    if (publish) {
      await replaceUnitGrants(tx, id, grants);
      await tx.post.updateMany({ where: { unitId: id, deletedAt: null }, data: { owner: name } });
    }
    return saved;
  });
  return (await hydrateCoverImages(await hydratePersonnelProfiles([toDto(row)], true)))[0];
}
