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

type RecordValue = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER = /^\d+$/;
const ROOT_KEYS = ['operation', 'timeline'];
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
];
const POLICY_KEYS = [
  'version',
  'requiresReason',
  'requiresExpectedRevision',
  'requiresSimulation',
  'requiresConfirmation',
  'requiredApprovals',
];
const EVENT_KEYS = [
  'kind',
  'occurredAt',
  'actorPrincipalId',
  'action',
  'decision',
  'resourceType',
  'resourceId',
  'eventId',
];
const STATUSES = [
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
const EVENT_KINDS = ['PROPOSED', 'CONFIRMATION', 'APPROVAL', 'CHANGE', 'AUDIT'];
const DECISIONS = ['APPROVED', 'REJECTED'];

function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value: unknown, keys: readonly string[]): value is RecordValue {
  return record(value) && Object.keys(value).length === keys.length && keys.every((key) => key in value);
}
function uuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
function integerText(value: unknown): value is string {
  return typeof value === 'string' && INTEGER.test(value);
}
function iso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}
function nullable(value: unknown, predicate: (candidate: unknown) => boolean): boolean {
  return value === null || predicate(value);
}
function fail(): never {
  throw new Error('Invalid AdminOperation audit response.');
}

function validateAudit(value: unknown, operationId: string): AdminOperationAuditView {
  if (!exact(value, ROOT_KEYS) || !Array.isArray(value.timeline)) fail();
  const operation = value.operation;
  if (!exact(operation, OPERATION_KEYS)) fail();
  const policy = operation.policy;
  if (!exact(policy, POLICY_KEYS)) fail();

  const booleans = [
    policy.requiresReason,
    policy.requiresExpectedRevision,
    policy.requiresSimulation,
    policy.requiresConfirmation,
  ];
  if (
    operation.id !== operationId ||
    !uuid(operation.id) ||
    !uuid(operation.principalId) ||
    !text(operation.capabilityKey) ||
    !text(operation.operationType) ||
    !text(operation.targetType) ||
    !nullable(operation.targetId, uuid) ||
    typeof operation.riskTier !== 'number' ||
    !Number.isInteger(operation.riskTier) ||
    operation.riskTier < 0 ||
    operation.riskTier > 4 ||
    typeof operation.status !== 'string' ||
    !STATUSES.includes(operation.status) ||
    !uuid(operation.correlationId) ||
    typeof operation.reasonRecorded !== 'boolean' ||
    !nullable(operation.expectedRevision, integerText) ||
    !integerText(operation.revision) ||
    !iso(operation.createdAt) ||
    !iso(operation.updatedAt) ||
    !nullable(operation.appliedAt, iso) ||
    typeof policy.version !== 'number' ||
    !Number.isInteger(policy.version) ||
    policy.version <= 0 ||
    booleans.some((entry) => typeof entry !== 'boolean') ||
    typeof policy.requiredApprovals !== 'number' ||
    !Number.isInteger(policy.requiredApprovals) ||
    policy.requiredApprovals < 0 ||
    policy.requiredApprovals > 2
  ) {
    fail();
  }

  for (const event of value.timeline) {
    if (!exact(event, EVENT_KEYS)) fail();
    if (
      typeof event.kind !== 'string' ||
      !EVENT_KINDS.includes(event.kind) ||
      !iso(event.occurredAt) ||
      !nullable(event.actorPrincipalId, uuid) ||
      !text(event.action) ||
      !nullable(event.decision, (entry) => typeof entry === 'string' && DECISIONS.includes(entry)) ||
      !nullable(event.resourceType, text) ||
      !nullable(event.resourceId, uuid) ||
      !uuid(event.eventId)
    ) {
      fail();
    }
  }
  return value as unknown as AdminOperationAuditView;
}

export class AdminOperationAuditApiClient extends AdminApiClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly request: typeof fetch = fetch,
  ) {
    super(baseUrl, request);
  }

  public async getAdminOperationAudit(operationId: string): Promise<AdminOperationAuditView> {
    if (!uuid(operationId)) {
      throw new AdminApiError(
        'invalid',
        'O ID da operação administrativa é inválido.',
        400,
        'INVALID_ADMIN_OPERATION_ID',
        null,
      );
    }

    let response: Response;
    try {
      response = await this.request(`${this.baseUrl}/admin/v1/operations/${operationId}/audit`, {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
    } catch {
      throw new AdminApiError('network', 'Admin API indisponível.', null, 'NETWORK_ERROR', null);
    }

    if (!response.ok) {
      throw new AdminApiError(
        'server',
        'A consulta de auditoria falhou.',
        response.status,
        `HTTP_${response.status}`,
        response.headers.get('x-correlation-id'),
      );
    }
    try {
      return validateAudit(await response.json(), operationId);
    } catch {
      throw new AdminApiError(
        'server',
        'A resposta da auditoria é inválida.',
        200,
        'INVALID_ADMIN_OPERATION_AUDIT_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }
}
