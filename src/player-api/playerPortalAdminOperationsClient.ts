export type AdminOperationStatus =
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

export type AdminOperationPolicy = {
  version: number;
  requiresReason: boolean;
  requiresExpectedRevision: boolean;
  requiresSimulation: boolean;
  requiresConfirmation: boolean;
  requiredApprovals: number;
};

export type AdminOperationDefinition = {
  kind: 'READ' | 'MUTATION';
  operationType: string;
  capabilityKey: string;
  riskTier: 0 | 1 | 2 | 3 | 4;
  authorizationMode: 'GLOBAL_ONLY' | 'SUBJECT';
  policy: AdminOperationPolicy;
};

export type AdminOperationCatalogResult =
  | { status: 'ok'; operations: AdminOperationDefinition[] }
  | { status: 'unauthenticated' | 'forbidden' };

export type AdminOperationPrepareInput = {
  requestId: string;
  operationType: string;
  input: Record<string, unknown>;
  reason?: string;
  expectedRevision?: string;
};

export type AdminOperationMutationResult =
  | {
      status: 'ok';
      operationId: string;
      operationStatus: AdminOperationStatus;
      result: Record<string, unknown> | null;
      replayed?: boolean;
    }
  | { status: 'unauthenticated' | 'forbidden' }
  | { status: 'rejected'; code: string };

export type AdminOperationAction = 'simulate' | 'confirm' | 'approve' | 'apply';

type Fetcher = typeof fetch;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION_TYPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const NON_NEGATIVE_INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const OPERATION_STATUSES = new Set<AdminOperationStatus>([
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
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOperationStatus(value: unknown): value is AdminOperationStatus {
  return typeof value === 'string' && OPERATION_STATUSES.has(value as AdminOperationStatus);
}

function isPolicy(value: unknown): value is AdminOperationPolicy {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    Number.isInteger(value.version) &&
    value.version > 0 &&
    typeof value.requiresReason === 'boolean' &&
    typeof value.requiresExpectedRevision === 'boolean' &&
    typeof value.requiresSimulation === 'boolean' &&
    typeof value.requiresConfirmation === 'boolean' &&
    typeof value.requiredApprovals === 'number' &&
    Number.isInteger(value.requiredApprovals) &&
    value.requiredApprovals >= 0 &&
    value.requiredApprovals <= 2
  );
}

function isDefinition(value: unknown): value is AdminOperationDefinition {
  return (
    isRecord(value) &&
    (value.kind === 'READ' || value.kind === 'MUTATION') &&
    typeof value.operationType === 'string' &&
    OPERATION_TYPE_PATTERN.test(value.operationType) &&
    typeof value.capabilityKey === 'string' &&
    OPERATION_TYPE_PATTERN.test(value.capabilityKey) &&
    typeof value.riskTier === 'number' &&
    Number.isInteger(value.riskTier) &&
    value.riskTier >= 0 &&
    value.riskTier <= 4 &&
    (value.authorizationMode === 'GLOBAL_ONLY' || value.authorizationMode === 'SUBJECT') &&
    isPolicy(value.policy)
  );
}

function deniedStatus(response: Response) {
  if (response.status === 401) return 'unauthenticated' as const;
  if (response.status === 403) return 'forbidden' as const;
  return null;
}

async function rejectedOrThrow(
  response: Response,
  body: unknown,
  context: string,
): Promise<{ status: 'rejected'; code: string }> {
  if (!response.ok) {
    return {
      status: 'rejected',
      code:
        isRecord(body) && typeof body.error === 'string' ? body.error : `HTTP_${response.status}`,
    };
  }
  throw new Error(`Invalid ${context} response`);
}

function parseOperationMutationBody(
  body: unknown,
  options: { requireReplay: boolean },
): AdminOperationMutationResult | null {
  if (
    !isRecord(body) ||
    typeof body.operationId !== 'string' ||
    !UUID_PATTERN.test(body.operationId) ||
    !isOperationStatus(body.status) ||
    !(body.result === null || isRecord(body.result))
  ) {
    return null;
  }
  if (options.requireReplay && typeof body.replayed !== 'boolean') return null;
  if (!options.requireReplay && body.replayed !== undefined && typeof body.replayed !== 'boolean') {
    return null;
  }

  return {
    status: 'ok',
    operationId: body.operationId,
    operationStatus: body.status,
    result: body.result,
    ...(typeof body.replayed === 'boolean' ? { replayed: body.replayed } : {}),
  };
}

export async function listAdminOperations(
  fetcher: Fetcher = fetch,
): Promise<AdminOperationCatalogResult> {
  const response = await fetcher('/api/hub/admin/operations', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  const denied = deniedStatus(response);
  if (denied) return { status: denied };
  if (!response.ok) throw new Error(`Admin operation catalog failed (${response.status})`);

  const body = (await response.json()) as unknown;
  if (!isRecord(body) || !Array.isArray(body.operations) || !body.operations.every(isDefinition)) {
    throw new Error('Invalid admin operation catalog response');
  }
  return { status: 'ok', operations: body.operations };
}

export async function prepareAdminOperation(
  input: AdminOperationPrepareInput,
  fetcher: Fetcher = fetch,
): Promise<AdminOperationMutationResult> {
  if (!UUID_PATTERN.test(input.requestId)) throw new Error('Invalid admin operation request id');
  if (!OPERATION_TYPE_PATTERN.test(input.operationType)) {
    throw new Error('Invalid admin operation type');
  }
  if (
    input.expectedRevision !== undefined &&
    !NON_NEGATIVE_INTEGER_PATTERN.test(input.expectedRevision)
  ) {
    throw new Error('Invalid admin operation expected revision');
  }

  const response = await fetcher('/api/hub/admin/operations', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const denied = deniedStatus(response);
  if (denied) return { status: denied };

  const body = (await response.json().catch(() => null)) as unknown;
  const parsed = parseOperationMutationBody(body, { requireReplay: true });
  if (parsed) return parsed;
  return rejectedOrThrow(response, body, 'admin operation prepare');
}

export async function advanceAdminOperation(
  operationId: string,
  action: AdminOperationAction,
  options: { reason?: string } = {},
  fetcher: Fetcher = fetch,
): Promise<AdminOperationMutationResult> {
  if (!UUID_PATTERN.test(operationId)) throw new Error('Invalid admin operation id');
  if (action === 'approve' && !options.reason?.trim()) {
    throw new Error('Approval reason is required');
  }

  const response = await fetcher(
    `/api/hub/admin/operations/${encodeURIComponent(operationId)}/${action}`,
    {
      method: 'POST',
      credentials: 'include',
      headers:
        action === 'approve'
          ? {
              accept: 'application/json',
              'content-type': 'application/json',
            }
          : { accept: 'application/json' },
      ...(action === 'approve' ? { body: JSON.stringify({ reason: options.reason?.trim() }) } : {}),
    },
  );
  const denied = deniedStatus(response);
  if (denied) return { status: denied };

  const body = (await response.json().catch(() => null)) as unknown;
  const parsed = parseOperationMutationBody(body, { requireReplay: false });
  if (parsed) return parsed;
  return rejectedOrThrow(response, body, `admin operation ${action}`);
}
