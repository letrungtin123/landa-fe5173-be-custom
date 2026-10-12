/* global URL, Buffer */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// A superadmin's tenant is chosen per tab. The stored session (shared by every
// tab) carries the tenant of the tab that wrote it last, so a reload or a
// sign-in in another tab must not move this tab to another tenant (badges of
// the chosen tenant disappeared after F5).
const source = readFileSync(new URL('./tabTenant.logic.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { tabTenantFor, keepsTabTenant, readTabTenantSelection, serializeTabTenantSelection } =
  await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

const SUPERADMIN = 'sa-1';
const DEEP_C = { id: 't-deepc', name: 'Deep C' };
const ADE = { id: 't-ade', name: 'ADE Group' };
const MANAGED = [ADE, DEEP_C];
const user = (tenant, id = SUPERADMIN) => ({ id, tenantId: tenant?.id ?? null, tenantName: tenant?.name ?? null });
const selectionOf = (u) => readTabTenantSelection(serializeTabTenantSelection(u));

test('after a reload the tab goes back to its own tenant, not the one another tab stored last', () => {
  // This tab chose Deep C; another tab then signed in and stored ADE Group.
  const thisTab = selectionOf(user(DEEP_C));
  assert.deepEqual(tabTenantFor(user(ADE), MANAGED, thisTab), { tenantId: DEEP_C.id, tenantName: 'Deep C' });
});

test('a selection that does not apply leaves the stored tenant in place', () => {
  assert.equal(tabTenantFor(user(ADE), MANAGED, null), null);
  assert.equal(tabTenantFor(user(ADE), MANAGED, selectionOf(user(DEEP_C, 'other-user'))), null);
  assert.equal(tabTenantFor(user(ADE), [ADE], selectionOf(user(DEEP_C))), null, 'tenant no longer managed');
  assert.equal(tabTenantFor(null, MANAGED, selectionOf(user(DEEP_C))), null, 'signed out');
});

test('taking over tokens another tab stored keeps this tab\'s tenant for the same user', () => {
  assert.equal(keepsTabTenant(user(DEEP_C), user(ADE), MANAGED), true);
});

test('another user, a tenant no longer managed, or a role without managed tenants follows the stored session', () => {
  assert.equal(keepsTabTenant(user(DEEP_C), user(ADE, 'other-user'), MANAGED), false);
  assert.equal(keepsTabTenant(user(DEEP_C), user(ADE), [ADE]), false);
  assert.equal(keepsTabTenant(user(DEEP_C, 'learner-1'), user(DEEP_C, 'learner-1'), []), false);
  assert.equal(keepsTabTenant(user(null), user(ADE), MANAGED), false);
  assert.equal(keepsTabTenant(null, user(ADE), MANAGED), false);
});

test('the per-tab selection round-trips and ignores malformed values', () => {
  assert.deepEqual(selectionOf(user(DEEP_C)), { userId: SUPERADMIN, tenantId: DEEP_C.id, tenantName: 'Deep C' });
  assert.equal(serializeTabTenantSelection(user(null)), null);
  assert.equal(serializeTabTenantSelection(null), null);
  for (const raw of [null, '', 'not json', 'null', '[]', '{"userId":"a"}', '{"userId":"","tenantId":"t"}', '{"userId":1,"tenantId":"t"}']) {
    assert.equal(readTabTenantSelection(raw), null, String(raw));
  }
});
