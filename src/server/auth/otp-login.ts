import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/server/database/prisma";
import { createSessionRecord, type IssuedSession } from "./session";
import { hashChallengeToken, verifyTotpOrRecoveryInTransaction } from "./totp";

const challengeMinutes = 5;
const attemptsWindowMs = 15 * 60 * 1000;
const maxChallengeAttempts = 5;
const maxAccountAttempts = 10;

type LoginStart =
  | { kind: "invalid" }
  | { kind: "otp"; token: string }
  | { kind: "session"; session: IssuedSession; mustChangePassword: boolean };

export async function beginLoginAfterPassword(userId: string, passwordHash: string, totpEnabled: boolean, returnTo: string): Promise<LoginStart> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: {
      passwordHash: true, status: true, lockedUntil: true, mustChangePassword: true,
      totp: { select: { enabledAt: true } },
    } });
    if (!user || user.passwordHash !== passwordHash || user.status !== "ACTIVE" ||
      Boolean(user.totp?.enabledAt) !== totpEnabled || (user.lockedUntil && user.lockedUntil > new Date())) return { kind: "invalid" };
    if (user.totp?.enabledAt) {
      const token = randomBytes(32).toString("base64url");
      await tx.loginChallenge.create({ data: {
        id: randomUUID(), userId, tokenHash: hashChallengeToken(token), returnTo,
        expiresAt: new Date(Date.now() + challengeMinutes * 60_000),
      } });
      return { kind: "otp", token };
    }
    const session = await createSessionRecord(tx, userId);
    await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return { kind: "session", session, mustChangePassword: user.mustChangePassword };
  });
}

type OtpResult =
  | { kind: "expired" }
  | { kind: "challenge-limit" }
  | { kind: "account-limit" }
  | { kind: "invalid" }
  | { kind: "success"; session: IssuedSession; mustChangePassword: boolean; returnTo: string };

export async function completeOtpLogin(token: string, code: string): Promise<OtpResult> {
  const tokenHash = hashChallengeToken(token);
  const startingChallenge = await prisma.loginChallenge.findUnique({ where: { tokenHash }, select: { userId: true } });
  if (!startingChallenge) return { kind: "expired" };

  return prisma.$transaction(async (tx) => {
    // Every challenge for this account, plus factor resets, shares this lock.
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${startingChallenge.userId} FOR UPDATE`;
    const now = new Date();
    const [challenge, user] = await Promise.all([
      tx.loginChallenge.findUnique({ where: { tokenHash }, select: { id: true, userId: true, attempts: true, expiresAt: true, returnTo: true } }),
      tx.user.findUnique({ where: { id: startingChallenge.userId }, select: { status: true, mustChangePassword: true, totp: { select: { enabledAt: true } } } }),
    ]);
    if (!challenge || challenge.userId !== startingChallenge.userId || challenge.expiresAt <= now || !user || user.status !== "ACTIVE" || !user.totp?.enabledAt) return { kind: "expired" };
    if (challenge.attempts >= maxChallengeAttempts) return { kind: "challenge-limit" };

    const recent = await tx.loginChallenge.aggregate({ where: {
      userId: challenge.userId, createdAt: { gt: new Date(now.getTime() - attemptsWindowMs) },
    }, _sum: { attempts: true } });
    const accountAttempts = recent._sum.attempts ?? 0;
    if (accountAttempts >= maxAccountAttempts) return { kind: "account-limit" };

    await tx.loginChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
    if (!(await verifyTotpOrRecoveryInTransaction(tx, challenge.userId, code))) {
      if (accountAttempts + 1 >= maxAccountAttempts) return { kind: "account-limit" };
      if (challenge.attempts + 1 >= maxChallengeAttempts) return { kind: "challenge-limit" };
      return { kind: "invalid" };
    }

    await tx.loginChallenge.deleteMany({ where: { userId: challenge.userId } });
    const session = await createSessionRecord(tx, challenge.userId);
    await tx.user.update({ where: { id: challenge.userId }, data: { lastLoginAt: now } });
    return { kind: "success", session, mustChangePassword: user.mustChangePassword, returnTo: challenge.returnTo };
  });
}
