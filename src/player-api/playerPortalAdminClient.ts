export type PlayerPortalAdminCapability = {
  key: string;
  riskTier: 0 | 1 | 2 | 3 | 4;
};

export type PlayerPortalAdminScope = {
  scopeType: 'GLOBAL' | 'PLAYER' | 'REGION' | 'AREA';
  scopeId: string | null;
};

export type PlayerPortalAdminAccess = {
  capabilities: PlayerPortalAdminCapability[];
  scopes: PlayerPortalAdminScope[];
};

export type PlayerPortalAdminAccessResult =
  | { status: 'authorized'; admin: PlayerPortalAdminAccess }
  | { status: 'not_admin' }
  | { status: 'unauthenticated' };

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRiskTier(value: unknown): value is 0 | 1 | 2 | 3 | 4 {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4;
}

function isCapability(value: unknown): value is PlayerPortalAdminCapability {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    value.key.trim().length > 0 &&
    isRiskTier(value.riskTier)
  );
}

function isScope(value: unknown): value is PlayerPortalAdminScope {
  return (
    isRecord(value) &&
    (value.scopeType === 'GLOBAL' ||
      value.scopeType === 'PLAYER' ||
      value.scopeType === 'REGION' ||
      value.scopeType === 'AREA') &&
    (value.scopeId === null || typeof value.scopeId === 'string')
  );
}

function isAdminAccess(value: unknown): value is PlayerPortalAdminAccess {
  return (
    isRecord(value) &&
    Array.isArray(value.capabilities) &&
    value.capabilities.length > 0 &&
    value.capabilities.every(isCapability) &&
    new Set(value.capabilities.map((capability) => capability.key)).size ===
      value.capabilities.length &&
    Array.isArray(value.scopes) &&
    value.scopes.every(isScope)
  );
}

export async function getPlayerPortalAdminAccess(
  fetcher: Fetcher = fetch,
): Promise<PlayerPortalAdminAccessResult> {
  const response = await fetcher('/api/hub/admin/self', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Admin access request failed (${response.status})`);

  const body = await response.json().catch(() => null);
  if (!isRecord(body) || !('admin' in body)) {
    throw new Error('Invalid admin access response');
  }
  if (body.admin === null) return { status: 'not_admin' };
  if (!isAdminAccess(body.admin)) throw new Error('Invalid admin access response');

  return { status: 'authorized', admin: body.admin };
}
