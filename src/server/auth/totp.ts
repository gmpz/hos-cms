import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const key = () => {
  const value = process.env.TOTP_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error("TOTP_ENCRYPTION_KEY must be a 32-byte hex key");
  return Buffer.from(value, "hex");
};
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32(bytes: Buffer) {
  let bits = 0, value = 0, output = "";
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { output += alphabet[(value >>> (bits -= 5)) & 31]; } }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
function fromBase32(input: string) {
  let bits = 0, value = 0; const output: number[] = [];
  for (const letter of input) { const digit = alphabet.indexOf(letter); if (digit < 0) throw new Error("Invalid TOTP secret"); value = (value << 5) | digit; bits += 5; if (bits >= 8) output.push((value >>> (bits -= 8)) & 255); }
  return Buffer.from(output);
}
function encrypt(secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}
function decrypt(value: string) {
  const [iv, tag, data] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key(), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
export function sealRecoveryCodes(userId: string, codes: string[]) {
  return encrypt(JSON.stringify({ userId, codes, issuedAt: Date.now() }));
}
export function openRecoveryCodes(value: string, userId: string): string[] | null {
  try {
    const data: unknown = JSON.parse(decrypt(value));
    if (!data || typeof data !== "object") return null;
    const record = data as { userId?: unknown; codes?: unknown; issuedAt?: unknown };
    if (record.userId !== userId || typeof record.issuedAt !== "number" || Date.now() - record.issuedAt > 5 * 60000 || !Array.isArray(record.codes) || record.codes.length !== 8 || !record.codes.every((code) => typeof code === "string" && /^[A-F0-9]{18}$/.test(code))) return null;
    return record.codes;
  } catch { return null; }
}
function codeAt(secret: string, step: number) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const offset = hmac[19] & 15;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
function matchingStep(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(Date.now() / 30000);
  for (const candidate of [step - 1, step, step + 1]) {
    const expected = Buffer.from(codeAt(secret, candidate));
    if (timingSafeEqual(expected, Buffer.from(code))) return candidate;
  }
  return null;
}
export async function hasTotp(userId: string) {
  return !!(await prisma.userTotp.findUnique({ where: { userId }, select: { enabledAt: true } }))?.enabledAt;
}
export async function beginTotpSetup(userId: string, passwordHash: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { passwordHash: true, status: true } });
    if (!user || user.status !== "ACTIVE" || user.passwordHash !== passwordHash) throw new Error("REAUTH_EXPIRED");
    const existing = await tx.userTotp.findUnique({ where: { userId } });
    if (existing?.enabledAt) throw new Error("ALREADY_ENABLED");
    const secret = base32(randomBytes(20));
    await tx.userTotp.upsert({ where: { userId }, create: { userId, encryptedSecret: encrypt(secret) }, update: { encryptedSecret: encrypt(secret), lastUsedStep: null } });
    return secret;
  });
}
export async function pendingTotpSecret(userId: string) {
  const row = await prisma.userTotp.findUnique({ where: { userId } });
  return row && !row.enabledAt ? decrypt(row.encryptedSecret) : null;
}
const settingsWindowMs = 15 * 60 * 1000;
const settingsMaxFailures = 5;

export async function getTotpSettingsBlockedUntil(userId: string) {
  const row = await prisma.userTotp.findUnique({ where: { userId }, select: { verificationBlockedUntil: true } });
  return row?.verificationBlockedUntil && row.verificationBlockedUntil.getTime() > Date.now() ? row.verificationBlockedUntil : null;
}

async function verifySettingsCode(userId: string, input: string, requiresEnabled: boolean) {
  return prisma.$transaction(async (tx) => {
    // Serialize attempts for this account so parallel requests cannot evade the counter.
    await tx.$queryRaw`SELECT user_id FROM cms_user_totp WHERE user_id = ${userId} FOR UPDATE`;
    const row = await tx.userTotp.findUnique({ where: { userId } });
    if (!row || Boolean(row.enabledAt) !== requiresEnabled) return { valid: false, step: null };
    const now = new Date();
    if (row.verificationBlockedUntil && row.verificationBlockedUntil > now) return { valid: false, step: null };

    const code = input.trim();
    const step = matchingStep(decrypt(row.encryptedSecret), code);
    let valid = step !== null && (row.lastUsedStep === null || row.lastUsedStep < BigInt(step));
    if (!valid && requiresEnabled && step === null) {
      const used = await tx.userRecoveryCode.updateMany({ where: { userId, codeHash: digest(code.toUpperCase()), usedAt: null }, data: { usedAt: now } });
      valid = used.count === 1;
    }
    if (valid) {
      await tx.userTotp.update({ where: { userId }, data: {
        ...(step !== null ? { lastUsedStep: BigInt(step) } : {}),
        failedVerificationAttempts: 0, failedVerificationWindowStartedAt: null, verificationBlockedUntil: null,
      } });
      return { valid: true, step };
    }

    const inWindow = row.failedVerificationWindowStartedAt && now.getTime() - row.failedVerificationWindowStartedAt.getTime() < settingsWindowMs;
    const failures = (inWindow ? row.failedVerificationAttempts : 0) + 1;
    await tx.userTotp.update({ where: { userId }, data: {
      failedVerificationAttempts: failures,
      failedVerificationWindowStartedAt: inWindow ? row.failedVerificationWindowStartedAt : now,
      verificationBlockedUntil: failures >= settingsMaxFailures ? new Date(now.getTime() + settingsWindowMs) : null,
    } });
    return { valid: false, step: null };
  });
}

export async function confirmTotpSetup(userId: string, code: string) {
  const verification = await verifySettingsCode(userId, code, false);
  if (!verification.valid) return null;
  const codes = Array.from({ length: 8 }, () => randomBytes(9).toString("hex").toUpperCase());
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${userId} FOR UPDATE`;
    const current = await tx.userTotp.findUnique({ where: { userId }, select: { enabledAt: true, lastUsedStep: true } });
    if (!current || current.enabledAt || current.lastUsedStep !== BigInt(verification.step!)) throw new Error("TOTP_SETUP_CHANGED");
    await tx.userTotp.update({ where: { userId }, data: { enabledAt: new Date() } });
    await tx.userRecoveryCode.deleteMany({ where: { userId } });
    await tx.userRecoveryCode.createMany({ data: codes.map((value) => ({ id: randomUUID(), userId, codeHash: digest(value) })) });
    await tx.session.deleteMany({ where: { userId } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: userId, action: "user.totp.enable", entityType: "user", entityId: userId, summary: "เปิดใช้งานการยืนยันตัวตนสองขั้นตอน" } });
  });
  return codes;
}
export async function verifyTotpOrRecoveryInTransaction(tx: Prisma.TransactionClient, userId: string, input: string) {
  const row = await tx.userTotp.findUnique({ where: { userId } });
  if (!row?.enabledAt) return false;
  const step = matchingStep(decrypt(row.encryptedSecret), input.trim());
  if (step !== null) {
    const updated = await tx.userTotp.updateMany({ where: { userId, enabledAt: { not: null }, OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: BigInt(step) } }] }, data: { lastUsedStep: BigInt(step) } });
    return updated.count === 1;
  }
  const used = await tx.userRecoveryCode.updateMany({ where: { userId, codeHash: digest(input.trim().toUpperCase()), usedAt: null }, data: { usedAt: new Date() } });
  return used.count === 1;
}
export async function disableTotp(userId: string, code: string) {
  if (!(await verifySettingsCode(userId, code, true)).valid) return false;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${userId} FOR UPDATE`;
    await tx.userTotp.delete({ where: { userId } });
    await tx.userRecoveryCode.deleteMany({ where: { userId } });
    await tx.loginChallenge.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: userId, action: "user.totp.disable", entityType: "user", entityId: userId, summary: "ปิดการยืนยันตัวตนสองขั้นตอน" } });
  });
  return true;
}
export async function regenerateRecoveryCodes(userId: string, code: string) {
  if (!(await verifySettingsCode(userId, code, true)).valid) return null;
  const codes = Array.from({ length: 8 }, () => randomBytes(9).toString("hex").toUpperCase());
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cms_users WHERE id = ${userId} FOR UPDATE`;
    if (!(await tx.userTotp.findUnique({ where: { userId }, select: { enabledAt: true } }))?.enabledAt) throw new Error("TOTP_NOT_ENABLED");
    await tx.userRecoveryCode.deleteMany({ where: { userId } });
    await tx.userRecoveryCode.createMany({ data: codes.map((value) => ({ id: randomUUID(), userId, codeHash: digest(value) })) });
    await tx.auditLog.create({ data: { id: randomUUID(), actorId: userId, action: "user.totp.recovery.regenerate", entityType: "user", entityId: userId, summary: "สร้างรหัสกู้บัญชีชุดใหม่" } });
  });
  return codes;
}
export { digest as hashChallengeToken };
