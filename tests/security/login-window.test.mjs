// Run only against the local development database:
// RUN_AUTH_DB_TESTS=1 node --env-file=.env --test tests/security/login-window.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import { PrismaClient } from '@prisma/client';
const require = createRequire(import.meta.url);

// Execute the actual repository with the test's Prisma client, without Next's
// server-only import boundary. No authentication logic is replaced.
function loadTs(path, overrides = {}) {
  const filename = new URL(path, import.meta.url).pathname;
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const compiledModule = new Module(filename);
  compiledModule.require = (id) => Object.hasOwn(overrides, id) ? overrides[id] : require(id);
  compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}

test('login windows, concurrency and audited administrator unlock', { skip: process.env.RUN_AUTH_DB_TESTS !== '1' }, async (t) => {
  assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname), 'Local database only');
  const prisma = new PrismaClient();
  const password = loadTs('../../src/server/auth/password.ts');
  const policy = await import('../../src/features/auth/password-policy.mjs');
  const { authenticate, unlockUserLogin } = loadTs('../../src/server/auth/users.ts', {
    'server-only': {}, '@/server/database/prisma': { prisma },
    '@/server/media/storage': { mediaPublicUrl: (name) => `/uploads/${name}` },
    './password': password, '@/features/auth/password-policy.mjs': policy,
  });
  const id = randomUUID();
  const username = `lock-test-${id}`;
  const secret = `Aa1!${randomUUID()}`;
  try {
    await prisma.user.create({data:{id,username,displayName:'Temporary login security test',passwordHash:await password.hashPassword(secret),role:'MEMBER'}});
    const row = () => prisma.user.findUniqueOrThrow({where:{id}});
    const reset = () => prisma.user.update({where:{id},data:{status:'ACTIVE',failedLoginAttempts:0,failedLoginWindowStartedAt:null,lockedUntil:null}});
    await t.test('fifth failure locks; attempts during lock do not extend it', async()=>{
      for(let i=1;i<=4;i++) { assert.equal(await authenticate(username,'wrong'),null); assert.equal((await row()).failedLoginAttempts,i); }
      const start=Date.now(); await authenticate(username,'wrong'); const locked=await row();
      assert.ok(locked.lockedUntil.getTime() >= start+15*60000);
      assert.equal(await authenticate(username,secret),null);
      assert.equal((await row()).lockedUntil.getTime(),locked.lockedUntil.getTime());
    });
    await t.test('expired window starts at one; successful login clears window', async()=>{
      await reset(); await prisma.user.update({where:{id},data:{failedLoginAttempts:4,failedLoginWindowStartedAt:new Date(Date.now()-16*60000)}});
      await authenticate(username,'wrong'); assert.equal((await row()).failedLoginAttempts,1); assert.equal((await row()).lockedUntil,null);
      assert.equal((await authenticate(username,secret)).id,id);
      assert.equal((await row()).failedLoginWindowStartedAt,null); assert.equal((await row()).failedLoginAttempts,0);
    });
    await t.test('concurrent failures cannot lose counts',async()=>{
      await reset(); await Promise.all(Array.from({length:8},()=>authenticate(username,'wrong')));
      assert.ok((await row()).lockedUntil > new Date());
    });
    await t.test('unlock clears failure state, preserves password, and records audit',async()=>{
      const hash=(await row()).passwordHash;
      await unlockUserLogin(id,id); const user=await row();
      assert.equal(user.lockedUntil,null); assert.equal(user.failedLoginAttempts,0); assert.equal(user.failedLoginWindowStartedAt,null); assert.equal(user.passwordHash,hash);
      assert.equal(await prisma.auditLog.count({where:{actorId:id,entityId:id,action:'user.login.unlock'}}),1);
      assert.equal((await authenticate(username,secret)).id,id);
    });
    await t.test('unlock does not enable disabled accounts',async()=>{
      await prisma.user.update({where:{id},data:{status:'DISABLED',lockedUntil:new Date(Date.now()+60000)}});
      await unlockUserLogin(id,id); assert.equal((await row()).status,'DISABLED'); assert.equal(await authenticate(username,secret),null);
    });
    await t.test('expired lock permits login',async()=>{
      await reset(); await prisma.user.update({where:{id},data:{lockedUntil:new Date(Date.now()-1)}});
      assert.equal((await authenticate(username,secret)).id,id);
    });
  } finally {
    await prisma.auditLog.deleteMany({where:{actorId:id}});
    await prisma.user.deleteMany({where:{id}});
    await prisma.$disconnect();
  }
});
