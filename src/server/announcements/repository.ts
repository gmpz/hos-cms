import "server-only";

import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { connection } from "next/server";
import { AnnouncementStatus, Prisma } from "@prisma/client";
import type { AnnouncementDto, ModalFrequency, ModalSnapshot, PublicAnnouncement } from "@/features/announcements/types";
import { announcementPlainText } from "@/features/announcements/announcement-content";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";
import { announcementInclude, announcementToDto, validatedImageAlt, AnnouncementInputError, type AnnouncementRow } from "@/server/announcements/record";

export { AnnouncementInputError } from "@/server/announcements/record";

type Input = ModalSnapshot;

function snapshotOf(row: Omit<Input, "modalFrequency"> & { modalFrequency: string }): ModalSnapshot {
  return { title: row.title, description: row.description, contentMode: row.contentMode,
    imageMediaId: row.imageMediaId, imageAlt: row.imageAlt, buttonLabel: row.buttonLabel,
    buttonUrl: row.buttonUrl, openInNewTab: row.openInNewTab,
    modalFrequency: row.modalFrequency as ModalFrequency, modalIntervalHours: row.modalIntervalHours, priority: row.priority };
}

function publishedSnapshot(value: Prisma.JsonValue | null): ModalSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.title !== "string" || typeof row.description !== "string" ||
    (row.contentMode !== "TEXT" && row.contentMode !== "IMAGE") ||
    !(row.imageMediaId === null || typeof row.imageMediaId === "string") ||
    typeof row.imageAlt !== "string" || typeof row.buttonLabel !== "string" ||
    typeof row.buttonUrl !== "string" || typeof row.openInNewTab !== "boolean" ||
    typeof row.priority !== "number") return null;
  const modalFrequency = row.modalFrequency ?? "INTERVAL";
  const modalIntervalHours = row.modalIntervalHours ?? 12;
  if (!["ALWAYS", "SESSION", "INTERVAL", "ONCE_PER_CAMPAIGN"].includes(String(modalFrequency)) ||
    typeof modalIntervalHours !== "number" || !Number.isSafeInteger(modalIntervalHours) ||
    modalIntervalHours < 1 || modalIntervalHours > 8760) return null;
  return { title: row.title, description: row.description, contentMode: row.contentMode,
    imageMediaId: row.imageMediaId, imageAlt: row.imageAlt, buttonLabel: row.buttonLabel,
    buttonUrl: row.buttonUrl, openInNewTab: row.openInNewTab,
    modalFrequency: modalFrequency as ModalFrequency, modalIntervalHours, priority: row.priority } as ModalSnapshot;
}

async function adminDto(row: AnnouncementRow): Promise<AnnouncementDto> {
  const snapshot = publishedSnapshot(row.publishedSnapshot);
  const media = snapshot?.imageMediaId ? await prisma.mediaAsset.findUnique({ where: { id: snapshot.imageMediaId }, select: { fileName: true } }) : null;
  return { ...announcementToDto(row), publishedModal: snapshot ? { ...snapshot, imageUrl: media ? mediaPublicUrl(media.fileName) : null } : null };
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max + 1);
}

function compareDisplayOrder(left: number, right: number): number {
  return (left === 0 ? Number.MAX_SAFE_INTEGER : left) - (right === 0 ? Number.MAX_SAFE_INTEGER : right);
}

function throwRevisionConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
    throw new AnnouncementInputError("ประกาศถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
  throw error;
}

function parseInput(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AnnouncementInputError("ข้อมูลประกาศไม่ถูกต้อง");
  const row = value as Record<string, unknown>;
  const title = text(row.title, 80);
  const description = typeof row.description === "string" ? row.description.trim() : "";
  const contentMode = row.contentMode;
  const imageMediaId = row.imageMediaId === null || row.imageMediaId === "" ? null : text(row.imageMediaId, 191);
  const imageAlt = text(row.imageAlt, 500);
  const buttonLabel = text(row.buttonLabel, 80);
  const buttonUrl = text(row.buttonUrl, 2048);
  const modalFrequency = row.modalFrequency ?? "ONCE_PER_CAMPAIGN";
  const modalIntervalHours = row.modalIntervalHours ?? 24;
  const priority = row.priority;
  if (!title || title.length > 80) throw new AnnouncementInputError("กรุณากรอกหัวข้อไม่เกิน 80 ตัวอักษร");
  if (imageMediaId && imageMediaId.length > 191) throw new AnnouncementInputError("ข้อมูลรูปภาพไม่ถูกต้อง");
  if (imageAlt.length > 500) throw new AnnouncementInputError("ข้อความอธิบายรูปภาพยาวเกินกำหนด");
  if (buttonLabel.length > 80 || buttonUrl.length > 2048) throw new AnnouncementInputError("ข้อมูลปุ่มยาวเกินกำหนด");
  if (contentMode !== "TEXT" && contentMode !== "IMAGE") throw new AnnouncementInputError("รูปแบบเนื้อหาไม่ถูกต้อง");
  if (announcementPlainText(description).length > 10000 || Buffer.byteLength(description, "utf8") > 60000)
    throw new AnnouncementInputError("ข้อความประกาศยาวเกินกำหนด");
  if (contentMode === "TEXT" && !announcementPlainText(description)) throw new AnnouncementInputError("กรุณากรอกข้อความประกาศ");
  if (contentMode === "IMAGE" && !imageMediaId) throw new AnnouncementInputError("กรุณาเลือกรูปภาพประกาศ");
  if (contentMode === "IMAGE" && !imageAlt) throw new AnnouncementInputError("กรุณากรอกข้อความอธิบายรูปภาพ");
  if (!["ALWAYS", "SESSION", "INTERVAL", "ONCE_PER_CAMPAIGN"].includes(String(modalFrequency)))
    throw new AnnouncementInputError("รูปแบบการแสดงซ้ำไม่ถูกต้อง");
  if (typeof modalIntervalHours !== "number" || !Number.isSafeInteger(modalIntervalHours) || modalIntervalHours < 1 || modalIntervalHours > 8760)
    throw new AnnouncementInputError("จำนวนชั่วโมงต้องเป็นจำนวนเต็มระหว่าง 1–8,760");
  if (!Number.isSafeInteger(priority) || typeof priority !== "number" || priority < 0 || priority > 9999)
    throw new AnnouncementInputError("ลำดับการแสดงผลไม่ถูกต้อง");
  if (buttonUrl && (!buttonUrl.startsWith("/") || buttonUrl.startsWith("//")) && !/^https?:\/\//i.test(buttonUrl)) throw new AnnouncementInputError("ลิงก์ปุ่มต้องเป็น URL ภายในหรือ http/https");
  if (/^https?:\/\//i.test(buttonUrl)) {
    try { new URL(buttonUrl); } catch { throw new AnnouncementInputError("ลิงก์ปุ่มไม่ถูกต้อง"); }
  }
  if (buttonUrl && !buttonLabel) throw new AnnouncementInputError("กรุณากรอกข้อความบนปุ่ม");
  return { title, description: contentMode === "IMAGE" ? "" : description, contentMode, imageMediaId, imageAlt,
    buttonLabel: buttonUrl ? buttonLabel : "", buttonUrl,
    openInNewTab: Boolean(buttonUrl && row.openInNewTab === true),
    modalFrequency: modalFrequency as ModalFrequency, modalIntervalHours, priority };
}

const include = announcementInclude;
const toDto = adminDto;

export async function listAnnouncements(): Promise<AnnouncementDto[]> {
  const rows = await prisma.announcement.findMany({ where: { deletedAt: null, displayMode: "MODAL" }, include,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }] });
  const items = await Promise.all(rows.map(toDto));
  return items.sort((a, b) => compareDisplayOrder(
    a.status === "PUBLISHED" ? a.publishedModal?.priority ?? a.priority : a.priority,
    b.status === "PUBLISHED" ? b.publishedModal?.priority ?? b.priority : b.priority,
  ));
}

export async function listDeletedAnnouncements(): Promise<AnnouncementDto[]> {
  const rows = await prisma.announcement.findMany({ where: { deletedAt: { not: null }, displayMode: "MODAL" }, include,
    orderBy: [{ deletedAt: "desc" }, { id: "asc" }] });
  return Promise.all(rows.map(toDto));
}

export async function listAdminModalPage(query: { page: number; pageSize: number; status: "all" | "published" | "draft" | "trash" }) {
  const trash = query.status === "trash";
  const where: Prisma.AnnouncementWhereInput = { displayMode: "MODAL", deletedAt: trash ? { not: null } : null,
    ...(query.status === "published" ? { status: AnnouncementStatus.PUBLISHED } : query.status === "draft" ? { status: AnnouncementStatus.DRAFT } : {}),
  };
  const base = { displayMode: "MODAL" as const, deletedAt: null };
  const [total, active, published, draft, deleted] = await Promise.all([
    prisma.announcement.count({ where }), prisma.announcement.count({ where: base }),
    prisma.announcement.count({ where: { ...base, status: AnnouncementStatus.PUBLISHED } }),
    prisma.announcement.count({ where: { ...base, status: AnnouncementStatus.DRAFT } }),
    prisma.announcement.count({ where: { displayMode: "MODAL", deletedAt: { not: null } } }),
  ]);
  const page = Math.min(query.page, Math.max(1, Math.ceil(total / query.pageSize)));
  const offset = (page - 1) * query.pageSize;
  const statusFilter = query.status === "published" ? Prisma.sql`AND status = 'PUBLISHED'` : query.status === "draft" ? Prisma.sql`AND status = 'DRAFT'` : Prisma.empty;
  const ids = trash
    ? await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM cms_announcements WHERE display_mode = 'MODAL' AND deleted_at IS NOT NULL ORDER BY deleted_at DESC, id ASC LIMIT ${query.pageSize} OFFSET ${offset}`)
    : await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM cms_announcements WHERE display_mode = 'MODAL' AND deleted_at IS NULL ${statusFilter}
      ORDER BY CASE WHEN COALESCE(CASE WHEN status = 'PUBLISHED' THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(published_snapshot, '$.priority')) AS UNSIGNED) ELSE priority END, priority) = 0 THEN 1 ELSE 0 END ASC,
      COALESCE(CASE WHEN status = 'PUBLISHED' THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(published_snapshot, '$.priority')) AS UNSIGNED) ELSE priority END, priority) ASC,
      updated_at DESC, id ASC LIMIT ${query.pageSize} OFFSET ${offset}`);
  const rows = await prisma.announcement.findMany({ where: { id: { in: ids.map((item) => item.id) } }, include });
  const byId = new Map(rows.map((row) => [row.id, row]));
  const items = await Promise.all(ids.flatMap(({ id }) => { const row = byId.get(id); return row ? [toDto(row)] : []; }));
  return { items, page, pageSize: query.pageSize, total, counts: { active, published, draft, trash: deleted } };
}

export async function getAnnouncement(id: string): Promise<AnnouncementDto | null> {
  const row = await prisma.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "MODAL" }, include });
  return row ? toDto(row) : null;
}

export async function listActivePublicAnnouncements(): Promise<PublicAnnouncement[]> {
  await connection();
  const rows = await prisma.announcement.findMany({ where: {
    deletedAt: null, status: AnnouncementStatus.PUBLISHED, displayMode: "MODAL",
    publishedSnapshot: { not: Prisma.DbNull },
  }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }] });
  const entries = rows.map((row) => ({ row, snapshot: publishedSnapshot(row.publishedSnapshot) }))
    .filter((entry): entry is { row: typeof rows[number]; snapshot: ModalSnapshot } => entry.snapshot !== null);
  const ids = [...new Set(entries.map(({ snapshot }) => snapshot.imageMediaId).filter((id): id is string => Boolean(id)))];
  const media = await prisma.mediaAsset.findMany({ where: { id: { in: ids } }, select: { id: true, fileName: true } });
  const urls = new Map(media.map((item) => [item.id, mediaPublicUrl(item.fileName)]));
  return entries.map(({ row, snapshot }) => ({ id: row.id, displayMode: "MODAL" as const,
    title: snapshot.title, description: snapshot.contentMode === "IMAGE" ? "" : snapshot.description,
    contentMode: snapshot.contentMode, imageAlt: snapshot.imageAlt, buttonLabel: snapshot.buttonLabel,
    buttonUrl: snapshot.buttonUrl, openInNewTab: snapshot.openInNewTab,
    modalFrequency: snapshot.modalFrequency, modalIntervalHours: snapshot.modalIntervalHours, priority: snapshot.priority,
    imageUrl: snapshot.imageMediaId ? urls.get(snapshot.imageMediaId) ?? null : null,
    modalCookieVersion: row.modalCookieVersion }))
    .filter((item) => item.contentMode !== "IMAGE" || item.imageUrl)
    .sort((a, b) => compareDisplayOrder(a.priority, b.priority));
}

export async function createAnnouncement(value: unknown, actorId: string, publish = false): Promise<AnnouncementDto> {
  const input = parseInput(value); if (input.imageMediaId) await validatedImageAlt(input.imageMediaId);
  const { imageMediaId, ...fields } = input;
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({ data: { id: randomUUID(), ...fields,
      ...(imageMediaId ? { imageMedia: { connect: { id: imageMediaId } } } : {}),
      displayMode: "MODAL", startsAt: null, endsAt: null,
      ...(publish ? { status: "PUBLISHED" as const, publishedAt: new Date(), publishedSnapshot: snapshotOf(input) as Prisma.InputJsonObject } : {}) } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "announcement.create", entityType: "announcement", entityId: created.id, summary: `สร้างประกาศ ${created.title}` } });
    return tx.announcement.findUniqueOrThrow({ where: { id: created.id }, include });
  });
  return toDto(row);
}

export async function updateAnnouncement(id: string, value: unknown, revision: unknown, actorId: string, publish = false): Promise<AnnouncementDto> {
  if (typeof revision !== "number" || !Number.isSafeInteger(revision)) throw new AnnouncementInputError("ข้อมูลประกาศไม่ใช่ฉบับล่าสุด", 409);
  const input = parseInput(value); if (input.imageMediaId) await validatedImageAlt(input.imageMediaId);
  const { imageMediaId, ...fields } = input;
  const row = await prisma.$transaction(async (tx) => {
    const current = await tx.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "MODAL" } });
    if (!current) throw new AnnouncementInputError("ไม่พบประกาศ", 404);
    if (current.revision !== revision) throw new AnnouncementInputError("ประกาศถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    const oldSnapshot = publishedSnapshot(current.publishedSnapshot);
    const nextSnapshot = snapshotOf(input);
    await tx.announcement.update({ where: { id, revision, deletedAt: null, displayMode: "MODAL" }, data: {
      ...fields, imageMedia: imageMediaId ? { connect: { id: imageMediaId } } : { disconnect: true },
      ...(publish ? { status: "PUBLISHED" as const, publishedAt: new Date(), publishedSnapshot: nextSnapshot as Prisma.InputJsonObject,
        hasUnpublishedChanges: false,
        ...(oldSnapshot && !isDeepStrictEqual(oldSnapshot, nextSnapshot) ? { modalCookieVersion: { increment: 1 } } : {}) }
        : { hasUnpublishedChanges: current.status === "PUBLISHED" && !!oldSnapshot && !isDeepStrictEqual(oldSnapshot, nextSnapshot) }),
      revision: { increment: 1 } } }).catch(throwRevisionConflict);
    const saved = await tx.announcement.findUniqueOrThrow({ where: { id }, include });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "announcement.update", entityType: "announcement", entityId: id, summary: `แก้ไขประกาศ ${saved.title}` } });
    return saved;
  });
  return toDto(row);
}

export async function actOnAnnouncement(id: string, action: "publish" | "unpublish" | "delete" | "discard-draft", revision: unknown, actorId: string): Promise<AnnouncementDto | null> {
  if (typeof revision !== "number" || !Number.isSafeInteger(revision)) throw new AnnouncementInputError("ข้อมูลประกาศไม่ใช่ฉบับล่าสุด", 409);
  return prisma.$transaction(async (tx) => {
    const current = await tx.announcement.findFirst({ where: { id, deletedAt: null, displayMode: "MODAL" } });
    if (!current) throw new AnnouncementInputError("ไม่พบประกาศ", 404);
    const snapshot = publishedSnapshot(current.publishedSnapshot);
    if (action === "discard-draft" && (current.status !== "PUBLISHED" || !current.hasUnpublishedChanges || !snapshot)) throw new AnnouncementInputError("ไม่มีร่างที่บันทึกไว้ให้ยกเลิก");
    const nextSnapshot = snapshotOf(current);
    const restoredFields = snapshot ? (() => {
      const { imageMediaId, ...fields } = snapshot;
      return { ...fields, imageMedia: imageMediaId ? { connect: { id: imageMediaId } } : { disconnect: true } };
    })() : {};
    const data: Prisma.AnnouncementUpdateInput = action === "publish"
      ? { status: "PUBLISHED", publishedAt: new Date(), publishedSnapshot: nextSnapshot as Prisma.InputJsonObject,
          hasUnpublishedChanges: false,
          ...(snapshot && !isDeepStrictEqual(snapshot, nextSnapshot) ? { modalCookieVersion: { increment: 1 } } : {}),
          revision: { increment: 1 } }
      : action === "unpublish" ? { status: "DRAFT", hasUnpublishedChanges: false, revision: { increment: 1 } }
      : action === "discard-draft" ? { ...restoredFields, hasUnpublishedChanges: false, revision: { increment: 1 } }
      : { deletedAt: new Date(), revision: { increment: 1 } };
    await tx.announcement.update({ where: { id, revision, deletedAt: null }, data }).catch(throwRevisionConflict);
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: `announcement.${action}`, entityType: "announcement", entityId: id, summary: `${action === "publish" ? "เผยแพร่" : action === "unpublish" ? "ยกเลิกเผยแพร่" : action === "discard-draft" ? "ยกเลิกร่าง" : "ลบ"}ประกาศ ${current.title}` } });
    if (action === "delete") return null;
    return toDto(await tx.announcement.findUniqueOrThrow({ where: { id }, include }));
  });
}

