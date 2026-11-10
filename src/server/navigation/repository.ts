import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Navigation } from "@/features/navigation/types";
import { isNavigation } from "@/features/navigation/validation";
import { prisma } from "@/server/database/prisma";

export class NavigationError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function getNavigation(): Promise<{ navigation: Navigation; revision: number }> {
  const row = await prisma.navigationConfig.findUnique({ where: { id: 1 } });
  if (!row || !isNavigation(row.document)) throw new NavigationError("ข้อมูลเมนูนำทางในฐานข้อมูลไม่ถูกต้อง", 500);
  return { navigation: row.document, revision: row.revision };
}

export function publicNavigation(navigation: Navigation, authenticated: boolean): Navigation {
  return {
    home: navigation.home,
    items: navigation.items
      .filter((item) => item.visible && (authenticated || !item.hideWhenLoggedOut))
      .map((item) => item.kind === "dropdown" ? {
        ...item,
        children: item.children.filter((child) => child.visible && (authenticated || !child.hideWhenLoggedOut)),
      } : item),
  };
}

export async function saveNavigation(input: unknown, revision: unknown, actorId: string) {
  if (!isNavigation(input) || JSON.stringify(input).length > 100_000) throw new NavigationError("ข้อมูลเมนูนำทางไม่ถูกต้อง");
  if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1) throw new NavigationError("ข้อมูลเมนูไม่ใช่ฉบับล่าสุด กรุณาโหลดใหม่", 409);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.navigationConfig.updateMany({ where: { id: 1, revision }, data: {
      document: input as unknown as Prisma.InputJsonObject,
      revision: { increment: 1 },
    } });
    if (!changed.count) throw new NavigationError("เมนูถูกแก้ไขจากที่อื่นแล้ว กรุณาโหลดใหม่", 409);
    await tx.auditLog.create({ data: { id: randomUUID(), actorId, action: "navigation.publish", entityType: "navigation", entityId: "main", summary: "บันทึกและเผยแพร่เมนูนำทาง" } });
    return { navigation: input, revision: revision + 1 };
  });
}
