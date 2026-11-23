import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";
import { hashPassword, verifyPassword } from "./password";
import { isValidPassword } from "@/features/auth/password-policy.mjs";

export type ManagedUser = {
  id: string; username: string; displayName: string; role: "ADMIN" | "MEMBER"; status: "ACTIVE" | "DISABLED"; lockedUntil: Date | null; lastLoginAt: Date | null; createdAt: Date;
  personTypeId: string | null; positionId: string | null; levelId: string | null; profileMediaId: string | null;
  photoUrl: string | null; profilePhotoFocusX: number; profilePhotoFocusY: number; profilePhotoZoom: number;
  phone: string; phoneExtension: string; email: string; publishPhone: boolean; publishEmail: boolean;
  unitIds: string[]; primaryUnitId: string | null;
};

export type UserProfileOptions = {
  personTypes: { id: string; name: string }[];
  positions: { id: string; name: string }[];
  levels: { id: string; name: string }[];
  units: { id: string; name: string }[];
  media: { id: string; name: string }[];
};

export async function authenticate(username: string, password: string): Promise<{ id: string; mustChangePassword: boolean } | null> {
  const normalized = username.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username: normalized } });
  if (!user || user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) return null;
  const passwordMatches = await verifyPassword(password, user.passwordHash);
  return prisma.$transaction(async (tx) => {
    // Serialize attempts for this account across all app processes. Password hashing
    // happens before taking the lock so it does not hold a database connection busy.
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    const now = new Date();
    if (!current || current.status !== "ACTIVE" || current.passwordHash !== user.passwordHash ||
      (current.lockedUntil && current.lockedUntil > now)) return null;
    if (!passwordMatches) {
      const windowStart = current.failedLoginWindowStartedAt;
      const inWindow = windowStart !== null && now.getTime() - windowStart.getTime() < 15 * 60000;
      const attempts = inWindow ? current.failedLoginAttempts + 1 : 1;
      const locked = attempts >= 5;
      await tx.user.update({ where: { id: current.id }, data: {
        failedLoginAttempts: locked ? 0 : attempts,
        failedLoginWindowStartedAt: locked ? null : inWindow ? windowStart : now,
        lockedUntil: locked ? new Date(now.getTime() + 15 * 60000) : null,
      } });
      return null;
    }
    await tx.user.update({ where: { id: current.id }, data: {
      failedLoginAttempts: 0, failedLoginWindowStartedAt: null, lockedUntil: null, lastLoginAt: now,
    } });
    return { id: current.id, mustChangePassword: current.mustChangePassword };
  });
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  if (!isValidPassword(newPassword)) throw new Error("INVALID_PASSWORD");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, username: true, status: true } });
  if (!user || user.status !== "ACTIVE" || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  if (await verifyPassword(newPassword, user.passwordHash)) throw new Error("SAME_PASSWORD");
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, passwordHash: user.passwordHash, status: "ACTIVE" },
      data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, failedLoginWindowStartedAt: null, lockedUntil: null },
    });
    if (updated.count !== 1) throw new Error("PASSWORD_CHANGED");
    await tx.session.deleteMany({ where: { userId } });
    await audit(tx, userId, "user.password.change", userId, `เปลี่ยนรหัสผ่านบัญชี ${user.username}`);
  });
  return true;
}

export async function listUsers(): Promise<ManagedUser[]> {
  const rows = await prisma.user.findMany({ select: {
    id: true, username: true, displayName: true, role: true, status: true, lockedUntil: true, lastLoginAt: true, createdAt: true,
    personTypeId: true, positionId: true, levelId: true, profileMediaId: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true, profileMedia: { select: { fileName: true } }, phone: true, phoneExtension: true, email: true, publishPhone: true, publishEmail: true,
    memberships: { select: { unitId: true, isPrimary: true } },
  }, orderBy: { createdAt: "desc" } });
  return rows.map(({ memberships, profileMedia, ...user }) => ({
    ...user,
    photoUrl: profileMedia ? mediaPublicUrl(profileMedia.fileName) : null,
    unitIds: memberships.map((membership) => membership.unitId),
    primaryUnitId: memberships.find((membership) => membership.isPrimary)?.unitId ?? null,
  }));
}

export async function getUserProfileOptions(): Promise<UserProfileOptions> {
  const [masters, units, media] = await Promise.all([
    prisma.profileMaster.findMany({ where: { active: true }, select: { id: true, kind: true, name: true }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    prisma.unit.findMany({ where: { id: { not: "hospital" }, deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.mediaAsset.findMany({ where: { kind: "IMAGE" }, select: { id: true, name: true }, orderBy: { uploadedAt: "desc" } }),
  ]);
  return {
    personTypes: masters.filter((item) => item.kind === "PERSON_TYPE").map(({ id, name }) => ({ id, name })),
    positions: masters.filter((item) => item.kind === "POSITION").map(({ id, name }) => ({ id, name })),
    levels: masters.filter((item) => item.kind === "LEVEL").map(({ id, name }) => ({ id, name })),
    units,
    media,
  };
}

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityId: string, summary: string) {
  await tx.auditLog.create({ data: { id: randomUUID(), actorId, action, entityType: "user", entityId, summary } });
}

async function assertNotLastActiveAdmin(tx: Prisma.TransactionClient, id: string) {
  const target = await tx.user.findUnique({ where: { id }, select: { role: true, status: true } });
  if (target?.role !== "ADMIN" || target.status !== "ACTIVE") return;
  const activeAdmins = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
  if (activeAdmins <= 1) throw new Error("LAST_ACTIVE_ADMIN");
}

export async function createUser(input: { username: string; displayName: string; password: string; role: "ADMIN" | "MEMBER" }, actorId: string) {
  if (!isValidPassword(input.password)) throw new Error("INVALID_PASSWORD");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { id: randomUUID(), username: input.username.trim().toLowerCase(), displayName: input.displayName.trim(), passwordHash, role: input.role } });
    await audit(tx, actorId, "user.create", created.id, `สร้างบัญชี ${created.username} (${created.role})`);
    return created;
  });
}

export async function createProfileMaster(input: { kind: "PERSON_TYPE" | "POSITION" | "LEVEL"; name: string }, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const last = await tx.profileMaster.findFirst({ where: { kind: input.kind }, select: { sortOrder: true }, orderBy: [{ sortOrder: "desc" }, { name: "desc" }] });
    const created = await tx.profileMaster.create({ data: { id: randomUUID(), kind: input.kind, name: input.name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "profile-master.create", entityType: "profile-master", entityId: created.id, summary: `เพิ่มข้อมูลโปรไฟล์ ${created.name} (${created.kind})` } });
    return created;
  });
}

export async function moveProfileMaster(id: string, direction: "up" | "down", actorId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.profileMaster.findUnique({ where: { id }, select: { kind: true, name: true } });
    if (!current) throw new Error("PROFILE_MASTER_NOT_FOUND");
    const rows = await tx.profileMaster.findMany({ where: { kind: current.kind }, select: { id: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    const index = rows.findIndex((row) => row.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    await Promise.all(rows.map((row, order) => tx.profileMaster.update({ where: { id: row.id }, data: { sortOrder: order + 1 } })));
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "profile-master.reorder", entityType: "profile-master", entityId: id, summary: `จัดลำดับข้อมูลโปรไฟล์ ${current.name} (${current.kind})` } });
  });
}

export async function listProfileMasters() {
  return prisma.profileMaster.findMany({
    select: { id: true, kind: true, name: true, active: true, sortOrder: true, _count: { select: { personTypeUsers: true, positionUsers: true, levelUsers: true } } },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function updateProfileMaster(id: string, input: { name?: string; active?: boolean }, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.profileMaster.findUnique({ where: { id } });
    if (!current) throw new Error("PROFILE_MASTER_NOT_FOUND");
    const updated = await tx.profileMaster.update({ where: { id }, data: { ...(input.name === undefined ? {} : { name: input.name.trim() }), ...(input.active === undefined ? {} : { active: input.active }) } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "profile-master.update", entityType: "profile-master", entityId: id, summary: `แก้ไขข้อมูลโปรไฟล์ ${updated.name} (${updated.kind})` } });
    return updated;
  });
}

export async function deleteProfileMaster(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.profileMaster.findUnique({ where: { id }, select: { name: true, kind: true, _count: { select: { personTypeUsers: true, positionUsers: true, levelUsers: true } } } });
    if (!current) throw new Error("PROFILE_MASTER_NOT_FOUND");
    const usage = current._count.personTypeUsers + current._count.positionUsers + current._count.levelUsers;
    if (usage > 0) throw new Error("PROFILE_MASTER_IN_USE");
    await tx.profileMaster.delete({ where: { id } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "profile-master.delete", entityType: "profile-master", entityId: id, summary: `ลบข้อมูลโปรไฟล์ ${current.name} (${current.kind})` } });
  });
}

export type UserProfileInput = {
  displayName: string; role: "ADMIN" | "MEMBER"; personTypeId: string | null; positionId: string | null; levelId: string | null;
  profileMediaId: string | null; phone: string; phoneExtension: string; email: string; publishPhone: boolean; publishEmail: boolean; unitIds: string[]; primaryUnitId: string | null;
  profilePhoto?: { action: "keep" | "replace" | "remove"; fileName?: string; mimeType?: string; sizeBytes?: number; focusX: number; focusY: number; zoom: number };
};

async function validateProfileReferences(tx: Prisma.TransactionClient, input: UserProfileInput) {
  const masterEntries = [[input.personTypeId, "PERSON_TYPE"], [input.positionId, "POSITION"], [input.levelId, "LEVEL"]] as const;
  for (const [id, kind] of masterEntries) {
    if (id && await tx.profileMaster.count({ where: { id, kind, active: true } }) !== 1) throw new Error("INVALID_PROFILE_REFERENCE");
  }
  if (input.profileMediaId && await tx.mediaAsset.count({ where: { id: input.profileMediaId, kind: "IMAGE" } }) !== 1) throw new Error("INVALID_PROFILE_REFERENCE");
  if (await tx.unit.count({ where: { id: { in: input.unitIds }, deletedAt: null } }) !== input.unitIds.length) throw new Error("INVALID_PROFILE_REFERENCE");
  if (input.primaryUnitId && !input.unitIds.includes(input.primaryUnitId)) throw new Error("INVALID_PRIMARY_UNIT");
}

export async function updateUser(id: string, input: UserProfileInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    if (target.role === "ADMIN" && input.role !== "ADMIN") await assertNotLastActiveAdmin(tx, id);
    const assetId = `profile:${id}`;
    if (input.profilePhoto?.action === "replace") {
      if (!input.profilePhoto.fileName || !input.profilePhoto.mimeType || input.profilePhoto.sizeBytes === undefined) throw new Error("INVALID_PROFILE_REFERENCE");
      await tx.mediaAsset.upsert({ where: { id: assetId }, create: { id: assetId, name: `รูปโปรไฟล์ ${input.displayName}`, kind: "IMAGE", mimeType: input.profilePhoto.mimeType, sizeBytes: input.profilePhoto.sizeBytes, alt: input.displayName, fileName: input.profilePhoto.fileName }, update: { name: `รูปโปรไฟล์ ${input.displayName}`, kind: "IMAGE", mimeType: input.profilePhoto.mimeType, sizeBytes: input.profilePhoto.sizeBytes, alt: input.displayName, fileName: input.profilePhoto.fileName } });
    }
    const effectiveInput = { ...input, profileMediaId: input.profilePhoto?.action === "replace" ? assetId : input.profilePhoto?.action === "remove" ? null : input.profileMediaId };
    await validateProfileReferences(tx, effectiveInput);
    const updated = await tx.user.update({ where: { id }, data: {
      displayName: input.displayName.trim(), role: input.role,
      personTypeId: input.personTypeId, positionId: input.positionId, levelId: input.levelId, profileMediaId: effectiveInput.profileMediaId,
      ...(input.profilePhoto ? { profilePhotoFocusX: input.profilePhoto.action === "remove" ? 50 : input.profilePhoto.focusX, profilePhotoFocusY: input.profilePhoto.action === "remove" ? 25 : input.profilePhoto.focusY, profilePhotoZoom: input.profilePhoto.action === "remove" ? 100 : input.profilePhoto.zoom } : {}),
      phone: input.phone, phoneExtension: input.phoneExtension, email: input.email, publishPhone: input.publishPhone, publishEmail: input.publishEmail,
    } });
    await tx.userUnit.deleteMany({ where: { userId: id } });
    if (input.unitIds.length) await tx.userUnit.createMany({ data: input.unitIds.map((unitId) => ({ userId: id, unitId, isPrimary: unitId === input.primaryUnitId })) });
    if (target.role !== input.role) await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actorId, "user.update", id, `แก้ไขบัญชี ${updated.username} (${updated.role})${target.role !== input.role ? " และเพิกถอน session" : ""}`);
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function setUserStatus(id: string, status: "ACTIVE" | "DISABLED", actorId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { username: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    if (status === "DISABLED") await assertNotLastActiveAdmin(tx, id);
    await tx.user.update({ where: { id }, data: { status } });
    if (status === "DISABLED") await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actorId, status === "DISABLED" ? "user.disable" : "user.enable", id, `${status === "DISABLED" ? "ปิดใช้งาน" : "เปิดใช้งาน"}บัญชี ${target.username}${status === "DISABLED" ? " และเพิกถอน session" : ""}`);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) throw new Error("SELF_ACTION");
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { username: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    await assertNotLastActiveAdmin(tx, id);
    const units = await tx.unit.findMany({ select: { payload: true, publishedPayload: true, draftAccessGrants: true } });
    if (units.some((unit) => [unit.payload, unit.publishedPayload, unit.draftAccessGrants].some((value) => JSON.stringify(value).includes(id))))
      throw new Error("USER_LINKED_TO_UNIT");
    await tx.pageAccessGrant.deleteMany({ where: { userId: id } });
    await tx.unitAccessGrant.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
    await audit(tx, actorId, "user.delete", id, `ลบบัญชี ${target.username}`);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function revokeUserSessions(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { username: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actorId, "user.sessions.revoke", id, `บังคับบัญชี ${target.username} ออกจากระบบทุกอุปกรณ์`);
  });
}

export async function resetUserPassword(id: string, password: string, actorId: string) {
  if (!isValidPassword(password)) throw new Error("INVALID_PASSWORD");
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { username: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true, failedLoginAttempts: 0, failedLoginWindowStartedAt: null, lockedUntil: null } });
    await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actorId, "user.password.reset", id, `รีเซ็ตรหัสผ่านบัญชี ${target.username} และเพิกถอน session`);
  });
}

export async function unlockUserLogin(id: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { username: true } });
    if (!target) throw new Error("USER_NOT_FOUND");
    await tx.user.update({ where: { id }, data: {
      failedLoginAttempts: 0, failedLoginWindowStartedAt: null, lockedUntil: null,
    } });
    await audit(tx, actorId, "user.login.unlock", id, `ปลดล็อกการเข้าสู่ระบบบัญชี ${target.username}`);
  });
}
