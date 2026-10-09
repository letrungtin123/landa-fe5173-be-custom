/* global URL, Buffer */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./authSession.logic.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { readFreshSessionTokens, removeStorageKeysWithPrefixes, readSsoRefusalMessage, LOGOUT_SESSION_STORAGE_PREFIXES } =
  await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('a fresh session is adopted only when the server sent complete tokens', () => {
  assert.deepEqual(readFreshSessionTokens({ access_token: 'a', refresh_token: 'r', expires_in: 900, user: {} }),
    { access_token: 'a', refresh_token: 'r', expires_in: 900 });
  for (const value of [null, undefined, {}, { access_token: 'a' }, { access_token: 'a', refresh_token: 'r' },
    { access_token: '', refresh_token: 'r', expires_in: 900 }, { access_token: 'a', refresh_token: 'r', expires_in: 0 }]) {
    assert.equal(readFreshSessionTokens(value), null);
  }
});

test('logout removes stored quiz answers and unsent chat turns only', () => {
  const values = new Map([
    ['la-block-submit', '{}'],
    ['chat-widget-pending-turn-v1:abc', '{}'],
    ['__branding', '{}'],
    ['la-app-nav', '{}'],
  ]);
  const storage = {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
  };
  assert.equal(removeStorageKeysWithPrefixes(storage, LOGOUT_SESSION_STORAGE_PREFIXES), 2);
  assert.deepEqual([...values.keys()], ['__branding', 'la-app-nav']);
});

test('a refused external sign-in shows the server message only for SSO_LOGIN_* codes', () => {
  const refusal = { response: { data: { code: 'SSO_LOGIN_EMAIL_NOT_VERIFIED', message: ' Please sign in with your password. ' } } };
  assert.equal(readSsoRefusalMessage(refusal), 'Please sign in with your password.');
  for (const error of [null, new Error('Request failed with status code 403'), { response: { data: { message: 'Token không hợp lệ' } } },
    { response: { data: { code: 'OTHER', message: 'x' } } }, { response: { data: { code: 'SSO_LOGIN_X', message: '' } } }]) {
    assert.equal(readSsoRefusalMessage(error), null);
  }
});
