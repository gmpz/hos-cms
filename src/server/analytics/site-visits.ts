import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { connection } from "next/server";
import { prisma } from "@/server/database/prisma";

export const visitCookieName = "hos_site_visit";
export const visitTimeoutSeconds = 30 * 60;
const retentionDays = 90;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function bangkokDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
}

export async function recordSiteVisit(input: { token: string | null; landingPath: string; source: string; device: string }) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - visitTimeoutSeconds * 1000);
  if (input.token && /^[A-Za-z0-9_-]{40,100}$/.test(input.token)) {
    const active = await prisma.siteVisitSession.updateMany({
      where: { tokenHash: tokenHash(input.token), lastActivityAt: { gt: cutoff } },
      data: { lastActivityAt: now },
    });
    if (active.count) return { token: input.token, created: false };
  }

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    await tx.siteVisitSession.create({ data: {
      id: randomUUID(), tokenHash: tokenHash(token), startedAt: now, lastActivityAt: now,
      landingPath: input.landingPath, source: input.source, device: input.device,
    } });
    await tx.siteVisitDaily.upsert({
      where: { day: bangkokDay(now) },
      create: { day: bangkokDay(now), visits: 1 },
      update: { visits: { increment: 1 } },
    });
  });
  // The daily summary remains; only short-lived session details are removed.
  const expired = new Date(now.getTime() - retentionDays * 86400000);
  await prisma.siteVisitSession.deleteMany({ where: { lastActivityAt: { lt: expired } } }).catch(() => undefined);
  return { token, created: true };
}

export async function todaySiteVisits() {
  await connection();
  const asOf = new Date();
  const row = await prisma.siteVisitDaily.findUnique({ where: { day: bangkokDay(asOf) }, select: { visits: true } });
  return { visits: row?.visits ?? 0, asOf };
}

export async function totalSiteVisits() {
  await connection();
  const totals = await prisma.siteVisitDaily.aggregate({ _sum: { visits: true } });
  return { visits: totals._sum.visits ?? 0, asOf: new Date().toISOString() };
}
