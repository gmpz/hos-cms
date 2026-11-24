import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const hash = (token) => createHash('sha256').update(token).digest('hex');

function loadSession(overrides) {
  const filename = new URL('../../src/server/auth/session.ts', import.meta.url).pathname;
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const compiledModule = new Module(filename);
  compiledModule.require = (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id);
  compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}

test('self-service session revocation preserves the current and other users sessions', async () => {
  const future = new Date(Date.now() + 60_000);
  const sessions = [
    { id: 'current', userId: 'user-a', tokenHash: hash('current-token'), expiresAt: future },
    { id: 'other-1', userId: 'user-a', tokenHash: hash('other-token-1'), expiresAt: future },
    { id: 'other-2', userId: 'user-a', tokenHash: hash('other-token-2'), expiresAt: future },
    { id: 'different-user', userId: 'user-b', tokenHash: hash('different-token'), expiresAt: future },
  ];
  const audit = [];
  let cookie = 'current-token';
  const matches = (row, where) => row.userId === where.userId &&
    (typeof where.tokenHash === 'string' ? row.tokenHash === where.tokenHash : row.tokenHash !== where.tokenHash.not) &&
    row.expiresAt > where.expiresAt.gt;
  const sessionModel = {
    findFirst: async ({ where }) => sessions.find((row) => matches(row, where)) ?? null,
    count: async ({ where }) => sessions.filter((row) => matches(row, where)).length,
    deleteMany: async ({ where }) => {
      const selected = sessions.filter((row) => matches(row, where));
      for (const row of selected) sessions.splice(sessions.indexOf(row), 1);
      return { count: selected.length };
    },
  };
  const prisma = {
    session: sessionModel,
    $transaction: async (callback) => callback({ session: sessionModel, auditLog: { create: async ({ data }) => { audit.push(data); } } }),
  };
  const { countOtherSessions, revokeOtherSessions } = loadSession({
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    'next/server': { connection: async () => {} },
    '@/server/database/prisma': { prisma },
    '@/server/media/storage': { mediaPublicUrl: () => '' },
  });

  assert.equal(await countOtherSessions('user-a'), 2);
  assert.equal(await revokeOtherSessions('user-a'), 2);
  assert.deepEqual(sessions.map((row) => row.id), ['current', 'different-user']);
  assert.equal(await countOtherSessions('user-a'), 0);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].actorId, 'user-a');

  cookie = 'invalid-token';
  assert.equal(await revokeOtherSessions('user-a'), null);
  assert.deepEqual(sessions.map((row) => row.id), ['current', 'different-user']);
});
