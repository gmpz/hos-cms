import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTs(path, overrides) {
  const filename = new URL(path, import.meta.url).pathname;
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = new Module(filename);
  compiledModule.require = (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id);
  compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}

test('admin 2FA reset password failures use the account login lockout', async () => {
  const user = {
    id: 'admin-id', username: 'admin', passwordHash: 'correct-password', role: 'ADMIN',
    status: 'ACTIVE', lockedUntil: null, failedLoginAttempts: 0, failedLoginWindowStartedAt: null,
    totp: { enabledAt: null },
  };
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUnique: async () => ({ ...user }),
      update: async ({ data }) => Object.assign(user, data),
    },
  };
  const prisma = {
    user: { findUnique: async () => ({ ...user }) },
    $transaction: async (callback) => callback(tx),
  };
  const { resetUserTotp } = loadTs('../../src/server/auth/users.ts', {
    'server-only': {},
    '@/server/database/prisma': { prisma },
    '@/server/media/storage': { mediaPublicUrl: () => '' },
    './password': { verifyPassword: async (password, hash) => password === hash, hashPassword: async () => '' },
    './otp-limit': {},
    '@/features/auth/password-policy.mjs': {},
  });

  for (let attempt = 1; attempt <= 4; attempt++) {
    await assert.rejects(resetUserTotp('target-id', user.id, 'wrong-password'), /INVALID_ADMIN_PASSWORD/);
    assert.equal(user.failedLoginAttempts, attempt);
  }
  const beforeLock = Date.now();
  await assert.rejects(resetUserTotp('target-id', user.id, 'wrong-password'), /INVALID_ADMIN_PASSWORD/);
  assert.ok(user.lockedUntil.getTime() >= beforeLock + 15 * 60_000);
  const lockedUntil = user.lockedUntil.getTime();
  await assert.rejects(resetUserTotp('target-id', user.id, 'correct-password'), /INVALID_ADMIN_PASSWORD/);
  assert.equal(user.lockedUntil.getTime(), lockedUntil);
});
