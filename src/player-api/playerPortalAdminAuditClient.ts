export type AdminAuditStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'SIMULATED'
  | 'PENDING_CONFIRMATION'
  | 'PENDING_APPROVAL'
  | 'READY'
  | 'APPLIED'
  | 'REJECTED'
  | 'FAILED'
  | 'COMPENSATED';

export type AdminAuditEntry = {
  operationId: string;
  operationType: string;
  actorDisplayName: string;
  targetType: string;
  riskTier: 0 | 1 | 2 | 3 | 4;
  status: AdminAuditStatus;
  reason: string | null;
  createdAt: string;
  appliedAt: string | null;
};

export type AdminAuditResult =
  | { status: 'ok'; entries: AdminAuditEntry[] }
  | { status: 'unauthenticated' | 'forbidden' };

type Fetcher = typeof fetch;

const STATUSES: readonly AdminAuditStatus[] = [
  'DRAFT',
  'VALIDATED',
  'SIMULATED',
  'PENDING_CONFIRMATION',
  'PENDING_APPROVAL',
  'READY',
  'APPLIED',
  'REJECTED',
  'FAILED',
  'COMPENSATED',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isEntry(value: unknown): value is AdminAuditEntry {
  return (
    isRecord(value) &&
    typeof value.operationId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(value.operationId) &&
    typeof value.operationType === 'string' &&
    value.operationType.length > 0 &&
    typeof value.actorDisplayName === 'string' &&
    value.actorDisplayName.length > 0 &&
    typeof value.targetType === 'string' &&
    value.targetType.length > 0 &&
    typeof value.riskTier === 'number' &&
    Number.isInteger(value.riskTier) &&
    value.riskTier >= 0 &&
    value.riskTier <= 4 &&
    typeof value.status === 'string' &&
    STATUSES.includes(value.status as AdminAuditStatus) &&
    (value.reason === null || typeof value.reason === 'string') &&
    isIsoDate(value.createdAt) &&
    (value.appliedAt === null || isIsoDate(value.appliedAt))
  );
}

export async function getAdminAudit(
  limit = 100,
  fetcher: Fetcher = fetch,
): Promise<AdminAuditResult> {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const response = await fetcher(`/api/hub/admin/audit?limit=${safeLimit}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) throw new Error(`Admin audit request failed (${response.status})`);

  const body = (await response.json()) as unknown;
  if (!isRecord(body) || !Array.isArray(body.entries) || !body.entries.every(isEntry)) {
    throw new Error('Invalid admin audit response');
  }
  return { status: 'ok', entries: body.entries };
}
