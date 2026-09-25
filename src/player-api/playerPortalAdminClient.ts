export type PlayerPortalAdminAccess = {
  principalId: string;
  owner: boolean;
  capabilities: string[];
};

export type PlayerPortalAdminResult =
  | { status: 'unauthenticated' }
  | { status: 'not-admin' }
  | { status: 'admin'; admin: PlayerPortalAdminAccess };

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAdminAccess(value: unknown): value is PlayerPortalAdminAccess {
  return (
    isRecord(value) &&
    typeof value.principalId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(value.principalId) &&
    (value.owner === undefined || typeof value.owner === 'boolean') &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every(
      (capability) => typeof capability === 'string' && capability.trim().length > 0,
    )
  );
}

export async function getPlayerPortalAdmin(
  fetcher: Fetcher = fetch,
): Promise<PlayerPortalAdminResult> {
  const response = await fetcher('/api/hub/admin/self', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Admin portal request failed (${response.status})`);

  const body = await response.json() as unknown;
  if (!isRecord(body) || !('admin' in body)) {
    throw new Error('Invalid admin portal response');
  }
  if (body.admin === null) return { status: 'not-admin' };
  if (!isAdminAccess(body.admin)) throw new Error('Invalid admin portal response');

  return {
    status: 'admin',
    admin: { ...body.admin, owner: body.admin.owner === true },
  };
}
