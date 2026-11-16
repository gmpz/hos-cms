import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type PageAccessLevel } from "@prisma/client";
import type { AccessGrants, AccessOptions } from "@/features/access/types";
import type { AuthUser } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

type Transaction = Prisma.TransactionClient;

export class AccessInputError extends Error {}

export function parseAccessGrants(value: unknown): AccessGrants {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AccessInputError("ข้อมูลผู้มีสิทธิ์ไม่ถูกต้อง");
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.unitIds) || !Array.isArray(record.userIds)) throw new AccessInputError("ข้อมูลผู้มีสิทธิ์ไม่ถูกต้อง");
  const unitIds = [...new Set(record.unitIds)];
  const userIds = [...new Set(record.userIds)];
  if (!unitIds.every((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 100)) throw new AccessInputError("ข้อมูลหน่วยงานที่ได้รับสิทธิ์ไม่ถูกต้อง");
  if (!userIds.every((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) throw new AccessInputError("ข้อมูลผู้ใช้ที่ได้รับสิทธิ์ไม่ถูกต้อง");
  return { unitIds, userIds };
}

export async function listAccessOptions(): Promise<AccessOptions> {
  const [units, users] = await Promise.all([
    prisma.unit.findMany({ where: { id: { not: "hospital" }, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, displayName: true, username: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true, profileMedia: { select: { fileName: true } } }, orderBy: { displayName: "asc" } }),
  ]);
  return {
    units: units.map((unit) => ({ id: unit.id, label: unit.name })),
    users: users.map((user) => ({ id: user.id, label: `${user.displayName} (@${user.username})`, photoUrl: user.profileMedia ? mediaPublicUrl(user.profileMedia.fileName) : null, photoFocusX: user.profilePhotoFocusX, photoFocusY: user.profilePhotoFocusY, photoZoom: user.profilePhotoZoom })),
  };
}

async function validatePrincipals(tx: Transaction, grants: AccessGrants) {
  const [unitCount, userCount] = await Promise.all([
    tx.unit.count({ where: { id: { in: grants.unitIds }, deletedAt: null } }),
    tx.user.count({ where: { id: { in: grants.userIds }, status: "ACTIVE" } }),
  ]);
  if (unitCount !== grants.unitIds.length || userCount !== grants.userIds.length) throw new AccessInputError("ผู้ใช้หรือหน่วยงานที่เลือกไม่มีอยู่หรือถูกปิดใช้งาน");
}

export async function replacePageGrants(tx: Transaction, pageId: string, grants: AccessGrants) {
  await validatePrincipals(tx, grants);
  await tx.pageAccessGrant.deleteMany({ where: { pageId } });
  if (grants.unitIds.length || grants.userIds.length) await tx.pageAccessGrant.createMany({ data: [
    ...grants.unitIds.map((unitId) => ({ id: randomUUID(), pageId, unitId })),
    ...grants.userIds.map((userId) => ({ id: randomUUID(), pageId, userId })),
  ] });
}

export async function replaceUnitGrants(tx: Transaction, resourceUnitId: string, grants: AccessGrants) {
  await validatePrincipals(tx, grants);
  await tx.unitAccessGrant.deleteMany({ where: { resourceUnitId } });
  if (grants.unitIds.length || grants.userIds.length) await tx.unitAccessGrant.createMany({ data: [
    ...grants.unitIds.map((unitId) => ({ id: randomUUID(), resourceUnitId, unitId })),
    ...grants.userIds.map((userId) => ({ id: randomUUID(), resourceUnitId, userId })),
  ] });
}

export async function canAccessPage(path: string, user: AuthUser | null): Promise<boolean> {
  const page = await prisma.cmsPage.findFirst({
    where: { path, deletedAt: null },
    select: { accessLevel: true, accessGrants: { select: { unitId: true, userId: true } } },
  });
  return canAccess(page?.accessLevel ?? "PUBLIC", page?.accessGrants ?? [], user);
}

export async function canAccessUnit(slug: string, user: AuthUser | null): Promise<boolean> {
  const unit = await prisma.unit.findUnique({
    where: { publishedSlug: slug },
    select: { publishedAccessLevel: true, landingAccessGrants: { select: { unitId: true, userId: true } } },
  });
  return canAccess(unit?.publishedAccessLevel ?? "PUBLIC", unit?.landingAccessGrants ?? [], user);
}

async function canAccess(level: PageAccessLevel, grants: { unitId: string | null; userId: string | null }[], user: AuthUser | null) {
  if (level === "PUBLIC") return true;
  if (!user || user.mustChangePassword) return false;
  if (user.role === "ADMIN" || level === "AUTHENTICATED") return true;
  if (grants.some((grant) => grant.userId === user.id)) return true;
  const allowedUnits = grants.flatMap((grant) => grant.unitId ? [grant.unitId] : []);
  if (!allowedUnits.length) return false;
  return await prisma.userUnit.count({ where: { userId: user.id, unitId: { in: allowedUnits } } }) > 0;
}
