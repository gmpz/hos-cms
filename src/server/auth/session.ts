import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

const cookieName = "hos_cms_session";
const sessionDays = 7;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

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
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  await prisma.session.create({ data: { id: randomUUID(), userId, tokenHash: tokenHash(token), expiresAt } });
  const store = await cookies();
  store.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
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

export async function destroySession() {
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  if (token && process.env.DATABASE_URL)
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  store.delete(cookieName);
}
