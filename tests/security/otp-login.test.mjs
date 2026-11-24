// Run only against the local development database:
// RUN_AUTH_DB_TESTS=1 node --env-file=.env --test tests/security/otp-login.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import { PrismaClient } from '@prisma/client';

const require = createRequire(import.meta.url);
function loadTs(path, overrides = {}) {
  const filename = new URL(path, import.meta.url).pathname;
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const compiledModule = new Module(filename);
  compiledModule.require = (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id);
  compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}

function currentCode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const bytes = [];
  for (const letter of secret) {
    value = (value << 5) | alphabet.indexOf(letter);
    bits += 5;
    if (bits >= 8) bytes.push((value >>> (bits -= 8)) & 255);
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = createHmac('sha1', Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[19] & 15;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}

test('OTP login limits concurrent attempts and stays revoked after admin reset', { skip: process.env.RUN_AUTH_DB_TESTS !== '1' }, async (t) => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  const prisma = new PrismaClient();
  const password = loadTs('../../src/server/auth/password.ts');
  const otpLimit = loadTs('../../src/server/auth/otp-limit.ts');
  const session = loadTs('../../src/server/auth/session.ts', {
    'server-only': {}, 'next/headers': { cookies: async () => ({}) }, 'next/server': { connection: async () => {} },
    '@/server/database/prisma': { prisma }, '@/server/media/storage': { mediaPublicUrl: () => '' },
  });
  const totp = loadTs('../../src/server/auth/totp.ts', { 'server-only': {}, '@/server/database/prisma': { prisma } });
  const { beginLoginAfterPassword, completeOtpLogin } = loadTs('../../src/server/auth/otp-login.ts', {
    'server-only': {}, '@/server/database/prisma': { prisma }, './session': session, './totp': totp,
  });
  const { authenticate, resetUserTotp, unlockUserOtp } = loadTs('../../src/server/auth/users.ts', {
    'server-only': {}, '@/server/database/prisma': { prisma }, '@/server/media/storage': { mediaPublicUrl: () => '' },
    './password': password, './otp-limit': otpLimit, '@/features/auth/password-policy.mjs': await import('../../src/features/auth/password-policy.mjs'),
  });
  const userId = randomUUID(), adminId = randomUUID();
  const adminPassword = `Aa1!${randomUUID()}`;
  const userPassword = `Aa1!${randomUUID()}`;
  const userHash = await password.hashPassword(userPassword);
  try {
    await prisma.user.createMany({ data: [
      { id: userId, username: `otp-test-${userId}`, displayName: 'OTP test member', passwordHash: userHash, role: 'MEMBER', mustChangePassword: false },
      { id: adminId, username: `otp-admin-test-${adminId}`, displayName: 'OTP test admin', passwordHash: await password.hashPassword(adminPassword), role: 'ADMIN', mustChangePassword: false },
    ] });
    await assert.rejects(totp.beginTotpSetup(userId, 'wrong-hash'), /REAUTH_EXPIRED/);
    assert.equal(await prisma.userTotp.count({ where: { userId } }), 0);
    const secret = await totp.beginTotpSetup(userId, userHash);
    const recoveryCodes = await totp.confirmTotpSetup(userId, currentCode(secret));
    assert.equal(recoveryCodes?.length, 8);

    await t.test('parallel bad codes stop at ten across three challenges', async () => {
      const starts = await Promise.all(Array.from({ length: 3 }, () => beginLoginAfterPassword(userId, userHash, true, '/admin')));
      assert.ok(starts.every((item) => item.kind === 'otp'));
      const tokens = starts.map((item) => item.token);
      const results = await Promise.all(Array.from({ length: 12 }, (_, index) => completeOtpLogin(tokens[index % 3], 'not-a-code')));
      assert.ok(results.every((item) => item.kind !== 'success'));
      const challenges = await prisma.loginChallenge.findMany({ where: { userId }, select: { attempts: true } });
      assert.equal(challenges.reduce((sum, item) => sum + item.attempts, 0), 10);
      assert.equal(await prisma.session.count({ where: { userId } }), 0);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).lastLoginAt, null);
      await unlockUserOtp(userId, adminId);
    });

    await t.test('a recovery code works once and records the completed login', async () => {
      const first = await beginLoginAfterPassword(userId, userHash, true, '/admin');
      assert.equal(first.kind, 'otp');
      assert.equal((await completeOtpLogin(first.token, recoveryCodes[0])).kind, 'success');
      assert.equal(await prisma.session.count({ where: { userId } }), 1);
      assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).lastLoginAt);
      const second = await beginLoginAfterPassword(userId, userHash, true, '/admin');
      assert.equal(second.kind, 'otp');
      assert.equal((await completeOtpLogin(second.token, recoveryCodes[0])).kind, 'invalid');
    });

    await t.test('admin reset and successful OTP login cannot leave a live session', async () => {
      const started = await beginLoginAfterPassword(userId, userHash, true, '/admin');
      assert.equal(started.kind, 'otp');
      const verifiedPassword = await authenticate(`otp-test-${userId}`, userPassword);
      assert.equal(verifiedPassword?.totpEnabled, true);
      await Promise.all([completeOtpLogin(started.token, recoveryCodes[1]), resetUserTotp(userId, adminId, adminPassword)]);
      assert.equal(await prisma.session.count({ where: { userId } }), 0);
      assert.equal(await prisma.userTotp.count({ where: { userId } }), 0);
      assert.equal(await prisma.loginChallenge.count({ where: { userId } }), 0);
      assert.equal(await prisma.userRecoveryCode.count({ where: { userId } }), 0);
      assert.deepEqual(await beginLoginAfterPassword(userId, verifiedPassword.passwordHash, verifiedPassword.totpEnabled, '/admin'), { kind: 'invalid' });
    });

    await t.test('wrong admin reset password shares the login lockout', async () => {
      for (let attempt = 1; attempt <= 4; attempt++) {
        await assert.rejects(resetUserTotp(userId, adminId, 'wrong-password'), /INVALID_ADMIN_PASSWORD/);
        assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).failedLoginAttempts, attempt);
      }
      await assert.rejects(resetUserTotp(userId, adminId, 'wrong-password'), /INVALID_ADMIN_PASSWORD/);
      const locked = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
      assert.ok(locked.lockedUntil > new Date());
      await assert.rejects(resetUserTotp(userId, adminId, adminPassword), /INVALID_ADMIN_PASSWORD/);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).lockedUntil?.getTime(), locked.lockedUntil.getTime());
    });
  } finally {
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: userId }, { actorId: adminId }, { entityId: userId }, { entityId: adminId }] } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
    await prisma.$disconnect();
  }
});
