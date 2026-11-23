import "server-only";

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import { AnnouncementInputError } from "@/server/announcements/repository";
import { announcementInclude, announcementToDto, validatedImageAlt, type AnnouncementRow } from "@/server/announcements/record";
import { prisma } from "@/server/database/prisma";
import type { AnnouncementDto, SplashFrequency, SplashSnapshot } from "@/features/announcements/types";
import { mediaPublicUrl } from "@/server/media/storage";

type Input = SplashSnapshot;

const include = announcementInclude;
const toDto = announcementToDto;

function snapshotOf(row: Omit<Input, "splashFrequency"> & { splashFrequency: string }): SplashSnapshot {
  return { title: row.title, description: row.description, contentMode: row.contentMode,
    imageMediaId: row.imageMediaId, imageAlt: row.imageAlt, buttonLabel: row.buttonLabel,
    splashFrequency: row.splashFrequency as SplashFrequency, splashIntervalHours: row.splashIntervalHours };
}

function publishedSnapshot(value: Prisma.JsonValue | null): SplashSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== "string" || typeof row.description !== "string" ||
    (row.contentMode !== "TEXT" && row.contentMode !== "IMAGE") ||
    !(row.imageMediaId === null || typeof row.imageMediaId === "string") ||
    typeof row.imageAlt !== "string" || typeof row.buttonLabel !== "string" ||
    !["ALWAYS", "SESSION", "INTERVAL", "ONCE_PER_CAMPAIGN"].includes(String(row.splashFrequency)) ||
    typeof row.splashIntervalHours !== "number") return null;
  return row as SplashSnapshot;
}

async function publishedImageUrl(snapshot: SplashSnapshot) {
  if (!snapshot.imageMediaId) return null;
  const media = await prisma.mediaAsset.findUnique({ where: { id: snapshot.imageMediaId }, select: { fileName: true } });
  return media ? mediaPublicUrl(media.fileName) : null;
}

async function adminDto(row: AnnouncementRow): Promise<AnnouncementDto> {
  const snapshot = publishedSnapshot(row.publishedSnapshot);
  return { ...toDto(row), publishedSplash: snapshot ? { ...snapshot, imageUrl: await publishedImageUrl(snapshot) } : null };
}

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max + 1) : ""; }

function parseInput(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AnnouncementInputError("ข้อมูล Splash Screen ไม่ถูกต้อง");
  const row = value as Record<string, unknown>;
  const input: Input = {
    title: text(row.title, 80), description: typeof row.description === "string" ? row.description.trim() : "",
    contentMode: row.contentMode === "IMAGE" ? "IMAGE" : "TEXT",
    imageMediaId: row.imageMediaId === null || row.imageMediaId === "" ? null : text(row.imageMediaId, 191), imageAlt: "",
    buttonLabel: text(row.buttonLabel, 80) || "เข้าสู่เว็บไซต์",
    splashFrequency: (row.splashFrequency ?? "ONCE_PER_CAMPAIGN") as SplashFrequency,
    splashIntervalHours: row.splashIntervalHours === undefined ? 24 : row.splashIntervalHours as number,
  };
  if (!input.title || input.title.length > 80) throw new AnnouncementInputError("กรุณากรอกหัวข้อไม่เกิน 80 ตัวอักษร");
  if (announcementPlainText(input.description).length > 10000 || Buffer.byteLength(input.description, "utf8") > 60000) throw new AnnouncementInputError("ข้อความ Splash Screen ยาวเกินกำหนด");
  if (input.contentMode === "TEXT" && !announcementPlainText(input.description)) throw new AnnouncementInputError("กรุณากรอกข้อความ Splash Screen");
  if (input.contentMode === "IMAGE" && !input.imageMediaId) throw new AnnouncementInputError("กรุณาเลือกรูปภาพ Splash Screen");
  if (!["ALWAYS", "SESSION", "INTERVAL", "ONCE_PER_CAMPAIGN"].includes(input.splashFrequency)) throw new AnnouncementInputError("รูปแบบการแสดงซ้ำไม่ถูกต้อง");
  if (!Number.isSafeInteger(input.splashIntervalHours) || input.splashIntervalHours < 1 || input.splashIntervalHours > 8760) throw new AnnouncementInputError("จำนวนชั่วโมงต้องเป็นจำนวนเต็มระหว่าง 1–8,760");
  return input;
}

export async function listSplashScreens() { return (await prisma.announcement.findMany({ where: { deletedAt: null, displayMode: "SPLASH" }, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })).map(toDto); }
export async function listDeletedSplashScreens() { return (await prisma.announcement.findMany({ where: { deletedAt: { not: null }, displayMode: "SPLASH" }, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }] })).map(toDto); }
export async function listAdminSplashPage(query: { page: number; pageSize: number; status: "all" | "published" | "draft" | "trash" }) {
  const trash = query.status === "trash";
  const where: Prisma.AnnouncementWhereInput = { displayMode: "SPLASH", deletedAt: trash ? { not: null } : null,
    ...(query.status === "published" ? { status: "PUBLISHED" } : query.status === "draft" ? { status: "DRAFT" } : {}),
  };
  const base = { displayMode: "SPLASH" as const, deletedAt: null };
  const [total, active, published, draft, deleted] = await Promise.all([
    prisma.announcement.count({ where }), prisma.announcement.count({ where: base }),
    prisma.announcement.count({ where: { ...base, status: "PUBLISHED" } }),
    prisma.announcement.count({ where: { ...base, status: "DRAFT" } }),
    prisma.announcement.count({ where: { displayMode: "SPLASH", deletedAt: { not: null } } }),
  ]);
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const rows = await prisma.announcement.findMany({ where, include, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * query.pageSize, take: query.pageSize });
  return { items: rows.map(toDto), page, pageSize: query.pageSize, total, counts: { active, published, draft, trash: deleted } };
}
export async function getSplashScreen(id: string) { const row = await prisma.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "SPLASH" }, include }); return row ? adminDto(row) : null; }
export async function getActiveSplashScreen() {
  const row = await prisma.announcement.findFirst({ where: { deletedAt: null, displayMode: "SPLASH", status: "PUBLISHED", splashSlot: 1, publishedSnapshot: { not: Prisma.DbNull } }, include });
  const snapshot = publishedSnapshot(row?.publishedSnapshot ?? null);
  if (!row || !snapshot) return null;
  const imageUrl = await publishedImageUrl(snapshot);
  return snapshot.contentMode === "IMAGE" && !imageUrl ? null : { ...toDto(row), ...snapshot, imageUrl };
}

export async function createSplashScreen(value: unknown, actorId: string, publish = false) {
  const input = parseInput(value); input.imageAlt = await validatedImageAlt(input.imageMediaId);
  const saved = await prisma.$transaction(async (tx) => {
    if (publish) await tx.announcement.updateMany({ where: { displayMode: "SPLASH", status: "PUBLISHED", deletedAt: null },
      data: { status: "DRAFT", splashSlot: null, revision: { increment: 1 } } });
    const created = await tx.announcement.create({ data: { id: randomUUID(), ...input, displayMode: "SPLASH", allowSuppression: false, repeatAfterDays: 30, priority: 0, startsAt: null, endsAt: null,
      ...(publish ? { status: "PUBLISHED" as const, splashSlot: 1, publishedAt: new Date(), publishedSnapshot: snapshotOf(input) as Prisma.InputJsonObject } : {}) } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "splash-screen.create", entityType: "splash-screen", entityId: created.id, summary: `สร้าง Splash Screen ${created.title}` } });
    return tx.announcement.findUniqueOrThrow({ where: { id: created.id }, include });
  });
  return adminDto(saved);
}

export async function updateSplashScreen(id: string, value: unknown, revision: unknown, actorId: string, publish = false) {
  if (typeof revision !== "number" || !Number.isSafeInteger(revision)) throw new AnnouncementInputError("ข้อมูล Splash Screen ไม่ใช่ฉบับล่าสุด", 409);
  const input = parseInput(value); input.imageAlt = await validatedImageAlt(input.imageMediaId);
  const saved = await prisma.$transaction(async (tx) => {
    const current = await tx.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "SPLASH" } });
    if (!current) throw new AnnouncementInputError("ไม่พบ Splash Screen", 404);
    if (current.revision !== revision) throw new AnnouncementInputError("Splash Screen ถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const oldSnapshot = publishedSnapshot(current.publishedSnapshot);
    const nextSnapshot = snapshotOf(input);
    if (publish) await tx.announcement.updateMany({ where: { id: { not: id }, displayMode: "SPLASH", status: "PUBLISHED", deletedAt: null },
      data: { status: "DRAFT", splashSlot: null, revision: { increment: 1 } } });
    const changed = await tx.announcement.updateMany({ where: { id, revision, deletedAt: null, displayMode: "SPLASH" }, data: {
      ...input, ...(publish ? { status: "PUBLISHED" as const, splashSlot: 1, publishedAt: new Date(), publishedSnapshot: nextSnapshot as Prisma.InputJsonObject, hasUnpublishedChanges: false } :
        { hasUnpublishedChanges: current.status === "PUBLISHED" && !!oldSnapshot && !isDeepStrictEqual(oldSnapshot, nextSnapshot) }),
      ...(publish && oldSnapshot && (oldSnapshot.splashFrequency !== input.splashFrequency || oldSnapshot.splashIntervalHours !== input.splashIntervalHours) ? { splashCookieVersion: { increment: 1 } } : {}),
      revision: { increment: 1 } } });
    if (!changed.count) throw new AnnouncementInputError("Splash Screen ถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const saved = await tx.announcement.findUniqueOrThrow({ where: { id }, include });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "splash-screen.update", entityType: "splash-screen", entityId: id, summary: `แก้ไข Splash Screen ${saved.title}` } });
    return saved;
  });
  return adminDto(saved);
}

export async function actOnSplashScreen(id: string, action: "publish" | "unpublish" | "delete" | "discard-draft", revision: unknown, actorId: string) {
  if (typeof revision !== "number" || !Number.isSafeInteger(revision)) throw new AnnouncementInputError("ข้อมูล Splash Screen ไม่ใช่ฉบับล่าสุด", 409);
  const saved = await prisma.$transaction(async (tx) => {
    const current = await tx.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "SPLASH" } });
    if (!current) throw new AnnouncementInputError("ไม่พบ Splash Screen", 404);
    if (current.revision !== revision) throw new AnnouncementInputError("Splash Screen ถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const snapshot = publishedSnapshot(current.publishedSnapshot);
    if (action === "discard-draft" && (current.status !== "PUBLISHED" || !current.hasUnpublishedChanges || !snapshot)) throw new AnnouncementInputError("ไม่มีร่างที่บันทึกไว้ให้ยกเลิก");
    if (action === "publish") await tx.announcement.updateMany({ where: { id: { not: id }, displayMode: "SPLASH", status: "PUBLISHED", deletedAt: null }, data: { status: "DRAFT", splashSlot: null, revision: { increment: 1 } } });
    const data: Prisma.AnnouncementUpdateManyMutationInput = action === "publish" ? { status: "PUBLISHED", splashSlot: 1, publishedAt: new Date(), publishedSnapshot: snapshotOf(current) as Prisma.InputJsonObject, hasUnpublishedChanges: false,
      ...(snapshot && (snapshot.splashFrequency !== current.splashFrequency || snapshot.splashIntervalHours !== current.splashIntervalHours) ? { splashCookieVersion: { increment: 1 } } : {}), revision: { increment: 1 } }
      : action === "unpublish" ? { status: "DRAFT", splashSlot: null, hasUnpublishedChanges: false, revision: { increment: 1 } }
      : action === "discard-draft" ? { ...snapshot, hasUnpublishedChanges: false, revision: { increment: 1 } }
      : { deletedAt: new Date(), splashSlot: null, revision: { increment: 1 } };
    const changed = await tx.announcement.updateMany({ where: { id, revision, deletedAt: null, displayMode: "SPLASH" }, data });
    if (!changed.count) throw new AnnouncementInputError("Splash Screen ถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: `splash-screen.${action}`, entityType: "splash-screen", entityId: id, summary: `${action === "publish" ? "เผยแพร่" : action === "unpublish" ? "ยกเลิกเผยแพร่" : action === "discard-draft" ? "ยกเลิกร่าง" : "ลบ"} Splash Screen ${current.title}` } });
    return action === "delete" ? null : tx.announcement.findUniqueOrThrow({ where: { id }, include });
  });
  return saved ? adminDto(saved) : null;
}
