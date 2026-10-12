// ============================================================
// Tenant selection per tab (superadmin) — pure helpers
//
// Every tab of the learner site shares one stored session (localStorage), and
// that stored session carries the tenant of whichever tab wrote it last: a new
// sign-in (login, link from the admin site), a token refresh or a tenant
// switch in another tab. A superadmin picks the tenant per tab, so:
//   1. after a reload the tab goes back to its own tenant (kept in
//      sessionStorage, which is per tab and survives a reload);
//   2. when the tab takes over the tokens another tab stored, it keeps its
//      own tenant instead of switching to the other tab's tenant.
// ============================================================

export const TAB_TENANT_STORAGE_KEY = "la-tab-tenant-v1";

export interface TabTenantSelection {
  userId: string;
  tenantId: string;
  tenantName: string | null;
}

interface TenantUserLike {
  id: string;
  tenantId: string | null;
  tenantName?: string | null;
}

interface TenantOptionLike {
  id: string;
  name?: string | null;
}

/** The value written to sessionStorage for this tab; null when there is nothing to remember. */
export function serializeTabTenantSelection(user: TenantUserLike | null | undefined): string | null {
  if (!user?.id || !user.tenantId) return null;
  const selection: TabTenantSelection = { userId: user.id, tenantId: user.tenantId, tenantName: user.tenantName ?? null };
  return JSON.stringify(selection);
}

/** Reads this tab's stored selection; anything malformed counts as no selection. */
export function readTabTenantSelection(raw: string | null): TabTenantSelection | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null;
    if (!value || typeof value !== "object") return null;
    if (typeof value.userId !== "string" || !value.userId) return null;
    if (typeof value.tenantId !== "string" || !value.tenantId) return null;
    return {
      userId: value.userId,
      tenantId: value.tenantId,
      tenantName: typeof value.tenantName === "string" ? value.tenantName : null,
    };
  } catch {
    return null;
  }
}

/**
 * The tenant this tab goes back to after a reload: its own selection, when it
 * belongs to the signed-in user and is still one of the tenants they manage.
 * null means "use the tenant of the stored session".
 */
export function tabTenantFor(
  user: TenantUserLike | null | undefined,
  managedTenants: readonly TenantOptionLike[] | null | undefined,
  selection: TabTenantSelection | null,
): { tenantId: string; tenantName: string | null } | null {
  if (!user || !selection || selection.userId !== user.id) return null;
  const tenant = (managedTenants ?? []).find((option) => option.id === selection.tenantId);
  if (!tenant) return null;
  return { tenantId: tenant.id, tenantName: tenant.name ?? selection.tenantName };
}

/**
 * Whether a tab that takes over the session another tab stored keeps its own
 * tenant: same user, and the tab's tenant is still one they manage. Users
 * without managed tenants (learner, staff) always follow the stored session.
 */
export function keepsTabTenant(
  tabUser: TenantUserLike | null | undefined,
  storedUser: TenantUserLike | null | undefined,
  storedManagedTenants: readonly TenantOptionLike[] | null | undefined,
): boolean {
  if (!tabUser?.tenantId || !storedUser || tabUser.id !== storedUser.id) return false;
  return (storedManagedTenants ?? []).some((option) => option.id === tabUser.tenantId);
}
