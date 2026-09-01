import { AdminApiClient, AdminApiError } from './admin-api';

export type AdminOperationAuditStatus =
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

export type AdminOperationAuditTimelineKind =
  | 'PROPOSED'
  | 'CONFIRMATION'
  | 'APPROVAL'
  | 'CHANGE'
  | 'AUDIT';

export type AdminOperationAuditDecision = 'APPROVED' | 'REJECTED';

export interface AdminOperationAuditPolicyView {
  readonly version: number;
  readonly requiresReason: boolean;
  readonly requiresExpectedRevision: boolean;
  readonly requiresSimulation: boolean;
  readonly requiresConfirmation: boolean;
  readonly requiredApprovals: number;
}

export interface AdminOperationAuditOperationView {
  readonly id: string;
  readonly principalId: string;
  readonly capabilityKey: string;
  readonly operationType: string;
  readonly targetType: string;
  readonly targetId: string | null;
  readonly riskTier: 0 | 1 | 2 | 3 | 4;
  readonly status: AdminOperationAuditStatus;
  readonly correlationId: string;
  readonly reasonRecorded: boolean;
  readonly expectedRevision: string | null;
  readonly revision: string;
  readonly policy: AdminOperationAuditPolicyView;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly appliedAt: string | null;
}

export interface AdminOperationAuditTimelineView {
  readonly kind: AdminOperationAuditTimelineKind;
  readonly occurredAt: string;
  readonly actorPrincipalId: string | null;
  readonly action: string;
  readonly decision: AdminOperationAuditDecision | null;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly eventId: string;
}

export interface AdminOperationAuditView {
  readonly operation: AdminOperationAuditOperationView;
  readonly timeline: readonly AdminOperationAuditTimelineView[];
}

type UnknownRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_STRING_PATTERN = /^\d+$/;
const ROOT_KEYS = ['operation', 'timeline'] as const;
const OPERATION_KEYS = [
  'id',
  'principalId',
  'capabilityKey',
  'operationType',
  'targetType',
  'targetId',
  'riskTier',
  'status',
  'correlationId',
  'reasonRecorded',
  'expectedRevision',
  'revision',
  'policy',
  'createdAt',
  'updatedAt',
  'appliedAt',
] as const;
const POLICY_KEYS = [
  'version',
  'requiresReason',
  'requiresExpectedRevision',
  'requiresSimulation',
  'requiresConfirmation',
  'requiredApprovals',
] as const;
const TIMELINE_KEYS = [
  'kind',
  'occurredAt',
  'actorPrincipalId',
  'action',
  'decision',
  'resourceType',
  'resourceId',
  'eventId',
] as const;
const STATUSES = new Set<AdminOperationAuditStatus>([
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
const TIMELINE_KINDS = new Set<AdminOperationAuditTimelineKind>([
  'PROPOSED',
  'CONFIRMATION',
  'APPROVAL',
  'CHANGE',
  'AUDIT',
]);
const DECISIONS = new Set<AdminOperationAuditDecision>(['APPROVED', 'REJECTED']);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isIntegerString(value: unknown): value is string {
  return typeof value === 'string' && INTEGER_STRING_PATTERN.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isCanonicalIsoTimestamp(value);
}

function assertPolicy(value: unknown): AdminOperationAuditPolicyView {
  if (!isRecord(value) || !hasExactKeys(value, POLICY_KEYS)) {
    throw new Error('Invalid AdminOperation audit policy.');
  }
  if (
    typeof value.version !== 'number' ||
    !Number.isInteger(value.version) ||
    value.version <= 0 ||
    typeof value.requiresReason !== 'boolean' ||
    typeof value.requiresExpectedRevision !== 'boolean' ||
    typeof value.requiresSimulation !== 'boolean' ||
    typeof value.requiresConfirmation !== 'boolean' ||
    typeof value.requiredApprovals !== 'number' ||
    !Number.isInteger(value.requiredApprovals) ||
    value.requiredApprovals < 0 ||
    value.requiredApprovals > 2
  ) {
    throw new Error('Invalid AdminOperation audit policy.');
  }
  return {
    version: value.version,
    requiresReason: value.requiresReason,
    requiresExpectedRevision: value.requiresExpectedRevision,
    requiresSimulation: value.requiresSimulation,
    requiresConfirmation: value.requiresConfirmation,
    requiredApprovals: value.requiredApprovals,
  };
}

function assertOperation(
  value: unknown,
  expectedOperationId: string,
): AdminOperationAuditOperationView {
  if (!isRecord(value) || !hasExactKeys(value, OPERATION_KEYS)) {
    throw new Error('Invalid AdminOperation audit operation.');
  }
  if (
    value.id !== expectedOperationId ||
    !isUuid(value.id) ||
    !isUuid(value.principalId) ||
    !isNonEmptyString(value.capabilityKey) ||
    !isNonEmptyString(value.operationType) ||
    !isNonEmptyString(value.targetType) ||
    !isNullableUuid(value.targetId) ||
    typeof value.riskTier !== 'number' ||
    !Number.isInteger(value.riskTier) ||
    value.riskTier < 0 ||
    value.riskTier > 4 ||
    typeof value.status !== 'string' ||
    !STATUSES.has(value.status as AdminOperationAuditStatus) ||
    !isUuid(value.correlationId) ||
    typeof value.reasonRecorded !== 'boolean' ||
    (value.expectedRevision !== null && !isIntegerString(value.expectedRevision)) ||
    !isIntegerString(value.revision) ||
    !isCanonicalIsoTimestamp(value.createdAt) ||
    !isCanonicalIsoTimestamp(value.updatedAt) ||
    !isNullableTimestamp(value.appliedAt)
  ) {
    throw new Error('Invalid AdminOperation audit operation.');
  }
  return {
    id: value.id,
    principalId: value.principalId,
    capabilityKey: value.capabilityKey,
    operationType: value.operationType,
    targetType: value.targetType,
    targetId: value.targetId,
    riskTier: value.riskTier as 0 | 1 | 2 | 3 | 4,
    status: value.status as AdminOperationAuditStatus,
    correlationId: value.correlationId,
    reasonRecorded: value.reasonRecorded,
    expectedRevision: value.expectedRevision,
    revision: value.revision,
    policy: assertPolicy(value.policy),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    appliedAt: value.appliedAt,
  };
}

function assertTimelineEvent(value: unknown): AdminOperationAuditTimelineView {
  if (!isRecord(value) || !hasExactKeys(value, TIMELINE_KEYS)) {
    throw new Error('Invalid AdminOperation audit timeline event.');
  }
  if (
    typeof value.kind !== 'string' ||
    !TIMELINE_KINDS.has(value.kind as AdminOperationAuditTimelineKind) ||
    !isCanonicalIsoTimestamp(value.occurredAt) ||
    !isNullableUuid(value.actorPrincipalId) ||
    !isNonEmptyString(value.action) ||
    (value.decision !== null &&
      (typeof value.decision !== 'string' ||
        !DECISIONS.has(value.decision as AdminOperationAuditDecision))) ||
    (value.resourceType !== null && !isNonEmptyString(value.resourceType)) ||
    !isNullableUuid(value.resourceId) ||
    !isUuid(value.eventId)
  ) {
    throw new Error('Invalid AdminOperation audit timeline event.');
  }
  return {
    kind: value.kind as AdminOperationAuditTimelineKind,
    occurredAt: value.occurredAt,
    actorPrincipalId: value.actorPrincipalId,
    action: value.action,
    decision: value.decision as AdminOperationAuditDecision | null,
    resourceType: value.resourceType,
    resourceId: value.resourceId,
    eventId: value.eventId,
  };
}

function assertAdminOperationAudit(
  value: unknown,
  expectedOperationId: string,
): AdminOperationAuditView {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS) || !Array.isArray(value.timeline)) {
    throw new Error('Invalid AdminOperation audit response.');
  }
  return {
    operation: assertOperation(value.operation, expectedOperationId),
    timeline: value.timeline.map(assertTimelineEvent),
  };
}

async function parseAuditError(response: Response): Promise<AdminApiError> {
  let code = `HTTP_${response.status}`;
  let message = 'A consulta de auditoria administrativa falhou.';
  let correlationId = response.headers.get('x-correlation-id');
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && isRecord(body.error)) {
      if (isNonEmptyString(body.error.code)) code = body.error.code;
      if (isNonEmptyString(body.error.message)) message = body.error.message;
      if (isNonEmptyString(body.error.correlationId)) correlationId = body.error.correlationId;
    }
  } catch {
    // The normalized transport error below is sufficient when the body is not JSON.
  }

  const kind =
    response.status === 401
      ? 'unauthenticated'
      : response.status === 403
        ? 'forbidden'
        : response.status === 400
          ? 'invalid'
          : response.status === 404
            ? 'not-found'
            : response.status === 409
              ? 'conflict'
              : 'server';
  return new AdminApiError(kind, message, response.status, code, correlationId);
}

export class AdminOperationAuditApiClient extends AdminApiClient {
  public constructor(
    private readonly auditApiBaseUrl: string,
    private readonly auditFetchImpl: typeof fetch = fetch,
  ) {
    super(auditApiBaseUrl, auditFetchImpl);
  }

  public async getAdminOperationAudit(operationId: string): Promise<AdminOperationAuditView> {
    if (!isUuid(operationId)) {
      throw new AdminApiError(
        'invalid',
        'O ID da operação administrativa é inválido.',
        400,
        'INVALID_ADMIN_OPERATION_ID',
        null,
      );
    }

    const url = new URL(`${this.auditApiBaseUrl}/admin/v1/operations/${operationId}/audit`);
    let response: Response;
    try {
      response = await this.auditFetchImpl(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
    } catch {
      throw new AdminApiError(
        'network',
        'Não foi possível alcançar a Admin API.',
        null,
        'NETWORK_ERROR',
        null,
      );
    }

    if (!response.ok) throw await parseAuditError(response);
    try {
      return assertAdminOperationAudit(await response.json(), operationId);
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta da auditoria da operação é inválida.',
        200,
        'INVALID_ADMIN_OPERATION_AUDIT_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }
}
