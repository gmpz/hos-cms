import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import { AnnouncementInputError } from "./record";

export async function actOnDeletedAnnouncement(
  id: string,
  displayMode: "MODAL" | "SPLASH",
  action: "restore" | "purge",
  revision: unknown,
  actorId: string,
): Promise<void> {
  if (typeof revision !== "number" || !Number.isSafeInteger(revision))
    throw new AnnouncementInputError("ข้อมูลไม่ใช่ฉบับล่าสุด", 409);
  await prisma.$transaction(async (tx) => {
    const current = await tx.announcement.findFirst({ where: { id, displayMode, deletedAt: { not: null } }, select: { title: true, revision: true } });
    if (!current) throw new AnnouncementInputError("ไม่พบรายการในถังขยะ", 404);
    if (current.revision !== revision) throw new AnnouncementInputError("รายการถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    if (action === "restore") {
      const changed = await tx.announcement.updateMany({ where: { id, displayMode, revision, deletedAt: { not: null } }, data: {
        deletedAt: null, status: "DRAFT", publishedAt: null, hasUnpublishedChanges: false, splashSlot: null,
        revision: { increment: 1 },
      } });
      if (!changed.count) throw new AnnouncementInputError("รายการถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    } else {
      const deleted = await tx.announcement.deleteMany({ where: { id, displayMode, revision, deletedAt: { not: null } } });
      if (!deleted.count) throw new AnnouncementInputError("รายการถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    }
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: `${displayMode === "SPLASH" ? "splash-screen" : "announcement"}.${action}`, entityType: displayMode === "SPLASH" ? "splash-screen" : "announcement", entityId: id,
      summary: `${action === "restore" ? "กู้คืน" : "ลบถาวร"}${displayMode === "SPLASH" ? " Splash Screen " : "ประกาศ "}${current.title}` } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
