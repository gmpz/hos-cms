import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const filename = new URL('../../src/server/auth/totp-reauth.ts', import.meta.url).pathname;
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

test('TOTP setup proof belongs to the current account and session and expires', async () => {
  const previousKey = process.env.TOTP_ENCRYPTION_KEY;
  process.env.TOTP_ENCRYPTION_KEY = 'a'.repeat(64);
  const values = new Map([['hos_cms_session', 'session-one']]);
  const store = {
    get: (name) => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value) => values.set(name, value),
    delete: (name) => values.delete(name),
  };
  const loaded = new Module(filename);
  loaded.require = (id) => id === 'server-only' ? {} : id === 'next/headers' ? { cookies: async () => store } : require(id);
  try {
    loaded._compile(compiled, filename);
    const { grantTotpSetupAccess, hasTotpSetupAccess, clearTotpSetupAccess } = loaded.exports;
    await grantTotpSetupAccess('member-one');
    assert.equal(await hasTotpSetupAccess('member-one'), true);
    assert.equal(await hasTotpSetupAccess('member-two'), false);
    values.set('hos_cms_session', 'session-two');
    assert.equal(await hasTotpSetupAccess('member-one'), false);
    values.set('hos_cms_session', 'session-one');
    const proof = values.get('hos_cms_totp_setup_reauth');
    values.set('hos_cms_totp_setup_reauth', `${Math.floor(Date.now() / 1000) - 1}.${proof.split('.')[1]}`);
    assert.equal(await hasTotpSetupAccess('member-one'), false);
    values.set('hos_cms_totp_setup_reauth', proof);
    await clearTotpSetupAccess();
    assert.equal(await hasTotpSetupAccess('member-one'), false);
  } finally {
    if (previousKey === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
    else process.env.TOTP_ENCRYPTION_KEY = previousKey;
  }
});
