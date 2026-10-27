export type AdminTeamPrincipal = {
  principalId: string;
  displayName: string;
  status: 'ACTIVE' | 'DISABLED';
  owner: boolean;
  receptionStaff: boolean;
  revision: string;
  capabilities: string[];
};

export type AdminTeamCapability = {
  key: string;
  riskTier: number;
};

export type AdminTeamResult =
  | { status: 'ok'; principals: AdminTeamPrincipal[]; capabilityCatalog: AdminTeamCapability[] }
  | { status: 'unauthenticated' | 'forbidden' };

export type AdminTeamUpdateResult =
  | { status: 'ok'; principal: AdminTeamPrincipal }
  | { status: 'unauthenticated' | 'forbidden' | 'conflict' }
  | { status: 'rejected'; code: string };

type Fetcher = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrincipal(value: unknown): value is AdminTeamPrincipal {
  return (
    isRecord(value) &&
    typeof value.principalId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(value.principalId) &&
    typeof value.displayName === 'string' &&
    (value.status === 'ACTIVE' || value.status === 'DISABLED') &&
    typeof value.owner === 'boolean' &&
    typeof value.receptionStaff === 'boolean' &&
    typeof value.revision === 'string' &&
    /^\d+$/.test(value.revision) &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every((key) => typeof key === 'string' && key.length > 0)
  );
}

function isCapability(value: unknown): value is AdminTeamCapability {
  return (
    isRecord(value) &&
    typeof value.key === 'string' &&
    value.key.length > 0 &&
    typeof value.riskTier === 'number' &&
    Number.isInteger(value.riskTier)
  );
}

export async function getAdminTeam(fetcher: Fetcher = fetch): Promise<AdminTeamResult> {
  const response = await fetcher('/api/hub/admin/team', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) throw new Error(`Admin team request failed (${response.status})`);

  const body = (await response.json()) as unknown;
  if (
    !isRecord(body) ||
    !Array.isArray(body.principals) ||
    !body.principals.every(isPrincipal) ||
    !Array.isArray(body.capabilityCatalog) ||
    !body.capabilityCatalog.every(isCapability)
  ) {
    throw new Error('Invalid admin team response');
  }
  return {
    status: 'ok',
    principals: body.principals,
    capabilityCatalog: body.capabilityCatalog,
  };
}

export async function replaceAdminTeamCapabilities(
  input: {
    principalId: string;
    capabilities: string[];
    reason: string;
    expectedRevision: string;
  },
  fetcher: Fetcher = fetch,
): Promise<AdminTeamUpdateResult> {
  const response = await fetcher(
    `/api/hub/admin/team/${encodeURIComponent(input.principalId)}/capabilities`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        capabilities: input.capabilities,
        reason: input.reason,
        expectedRevision: input.expectedRevision,
      }),
    },
  );
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (response.status === 409) return { status: 'conflict' };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown;
    const code =
      isRecord(body) && typeof body.error === 'string' ? body.error : 'ADMIN_TEAM_REJECTED';
    return { status: 'rejected', code };
  }
  const body = (await response.json()) as unknown;
  if (!isRecord(body) || !isPrincipal(body.principal)) {
    throw new Error('Invalid admin team update response');
  }
  return { status: 'ok', principal: body.principal };
}

export async function addAdminTeamPrincipal(
  input: {
    playerId: string;
    capabilities?: string[];
    reason: string;
    receptionStaff: boolean;
  },
  fetcher: Fetcher = fetch,
): Promise<AdminTeamUpdateResult> {
  const response = await fetcher('/api/hub/admin/team', {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      playerId: input.playerId,
      capabilities: input.capabilities ?? [],
      reason: input.reason,
      receptionStaff: input.receptionStaff,
    }),
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown;
    const code =
      isRecord(body) && typeof body.error === 'string' ? body.error : 'ADMIN_TEAM_REJECTED';
    return { status: 'rejected', code };
  }
  const body = (await response.json()) as unknown;
  if (!isRecord(body) || !isPrincipal(body.principal)) {
    throw new Error('Invalid admin team create response');
  }
  return { status: 'ok', principal: body.principal };
}

export async function setAdminTeamReceptionStaff(
  input: { principalId: string; active: boolean; reason: string },
  fetcher: Fetcher = fetch,
): Promise<AdminTeamUpdateResult> {
  const response = await fetcher(
    `/api/hub/admin/team/${encodeURIComponent(input.principalId)}/reception-staff`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ active: input.active, reason: input.reason }),
    },
  );
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as unknown;
    const code =
      isRecord(body) && typeof body.error === 'string' ? body.error : 'ADMIN_TEAM_REJECTED';
    return { status: 'rejected', code };
  }
  const body = (await response.json()) as unknown;
  if (!isRecord(body) || !isPrincipal(body.principal)) {
    throw new Error('Invalid Reception staff update response');
  }
  return { status: 'ok', principal: body.principal };
}
