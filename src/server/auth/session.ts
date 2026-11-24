import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

const cookieName = "hos_cms_session";
const sessionDays = 7;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export type IssuedSession = { token: string; expiresAt: Date };

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "MEMBER";
  mustChangePassword: boolean;
  photoUrl: string | null;
  profilePhotoFocusX: number;
  profilePhotoFocusY: number;
  profilePhotoZoom: number;
};
export async function createSessionRecord(tx: Prisma.TransactionClient, userId: string): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  await tx.session.create({ data: { id: randomUUID(), userId, tokenHash: tokenHash(token), expiresAt } });
  return { token, expiresAt };
}
export async function setSessionCookie({ token, expiresAt }: IssuedSession) {
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
export async function createSession(userId: string) {
  const issued = await prisma.$transaction((tx) => createSessionRecord(tx, userId));
  await setSessionCookie(issued);
}

export async function currentUser(): Promise<AuthUser | null> {
  await connection();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const session = await prisma.session.findFirst({
    where: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() }, user: { status: "ACTIVE" } },
    select: { user: { select: { id: true, username: true, displayName: true, role: true, mustChangePassword: true, profilePhotoFocusX: true, profilePhotoFocusY: true, profilePhotoZoom: true, profileMedia: { select: { fileName: true } } } } },
  });
  if (!session) return null;
  const { profileMedia, ...user } = session.user;
  return { ...user, photoUrl: profileMedia ? mediaPublicUrl(profileMedia.fileName) : null };
}

export async function countOtherSessions(userId: string): Promise<number> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return 0;
  const currentHash = tokenHash(token);
  const now = new Date();
  const current = await prisma.session.findFirst({
    where: { userId, tokenHash: currentHash, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (!current) return 0;
  return prisma.session.count({ where: { userId, tokenHash: { not: currentHash }, expiresAt: { gt: now } } });
}

export async function revokeOtherSessions(userId: string): Promise<number | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const currentHash = tokenHash(token);
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const current = await tx.session.findFirst({
      where: { userId, tokenHash: currentHash, expiresAt: { gt: now }, user: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!current) return null;
    const deleted = await tx.session.deleteMany({
      where: { userId, tokenHash: { not: currentHash }, expiresAt: { gt: now } },
    });
    if (deleted.count) await tx.auditLog.create({ data: {
      id: randomUUID(), actorId: userId, action: "user.sessions.self.revoke",
      entityType: "user", entityId: userId,
      summary: `ออกจากระบบบนเซสชันอื่น ${deleted.count} รายการ`,
    } });
    return deleted.count;
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token && process.env.DATABASE_URL)
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  store.delete(cookieName);
}
