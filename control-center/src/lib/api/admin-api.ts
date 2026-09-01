import { AdminApiError, AdminApiClient as CoreAdminApiClient } from './admin-api-core';

export * from './admin-api-core';

export type ContentResourceKind =
  | 'SPECIES'
  | 'MOVE'
  | 'ITEM'
  | 'AREA'
  | 'ENCOUNTER_TABLE'
  | 'REWARD'
  | 'EFFECT';
export type ContentReleaseStatus = 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'ARCHIVED';
export type ContentUnpublishedStatus = 'DRAFT' | 'VALIDATED';
export type ContentUnpublishedWorkflowState = 'EDITING' | 'READY_TO_PUBLISH';
export type ContentReleaseDiffCategory =
  | 'types'
  | 'species'
  | 'forms'
  | 'moves'
  | 'abilities'
  | 'items'
  | 'natures'
  | 'effects'
  | 'rewards'
  | 'regions'
  | 'areas'
  | 'connections'
  | 'formAbilities'
  | 'learnsets'
  | 'evolutions'
  | 'starterOptions'
  | 'purchaseOffers'
  | 'encounterTables';
export type RuntimeWhatsappProviderState =
  | 'STARTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'STOPPED'
  | 'INVALIDATED';
export type MessagingInboxStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
export type MessagingOutboxStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'DEAD';
export type IncidentSignalSource = 'ADMIN_OPERATION' | 'INBOX' | 'OUTBOX';
export type IncidentSignalState = 'FAILED' | 'DEAD';
export type IncidentRunbookKey =
  | 'admin-operation-failed'
  | 'inbox-processing-failed'
  | 'outbox-delivery-failed'
  | 'outbox-dead-letter';
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

export interface ContentLibraryQuery {
  readonly query?: string;
  readonly resourceKind?: ContentResourceKind;
  readonly releaseStatus?: ContentReleaseStatus;
  readonly active?: boolean;
  readonly limit: number;
}
export interface ContentLibraryItem {
  readonly releaseId: string;
  readonly releaseNo: string;
  readonly releaseName: string;
  readonly releaseStatus: ContentReleaseStatus;
  readonly releaseRevision: string;
  readonly resourceKind: ContentResourceKind;
  readonly resourceId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly active: boolean;
}
export interface ContentLibraryResult {
  readonly items: readonly ContentLibraryItem[];
  readonly nextCursor: string | null;
}
export interface ContentUnpublishedRelease {
  readonly releaseId: string;
  readonly releaseNo: string;
  readonly releaseName: string;
  readonly status: ContentUnpublishedStatus;
  readonly workflowState: ContentUnpublishedWorkflowState;
  readonly revision: string;
  readonly parentReleaseId: string | null;
  readonly createdAt: string;
  readonly validatedAt: string | null;
  readonly recordedChangeCount: string;
  readonly lastChangedAt: string | null;
}
export interface ContentReleaseDiffQuery {
  readonly fromReleaseId: string;
  readonly toReleaseId: string;
}
export interface ContentReleaseDiffSection {
  readonly category: ContentReleaseDiffCategory;
  readonly added: number;
  readonly removed: number;
  readonly changed: number;
}
export interface ContentReleaseDiff {
  readonly fromReleaseId: string;
  readonly toReleaseId: string;
  readonly sections: readonly ContentReleaseDiffSection[];
}
export interface ContentReleaseValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}
export interface ContentReleaseValidationPreview {
  readonly releaseId: string;
  readonly valid: boolean;
  readonly issues: readonly ContentReleaseValidationIssue[];
}
export interface RuntimeWhatsappHealthRuntime {
  readonly providerState: RuntimeWhatsappProviderState;
  readonly deploymentRevision: string;
  readonly startedAt: string;
  readonly lastConnectedAt: string | null;
  readonly lastHeartbeatAt: string;
  readonly lastDisconnectAt: string | null;
  readonly stoppedAt: string | null;
}
export interface RuntimeWhatsappHealthView {
  readonly environment: 'development' | 'staging' | 'production';
  readonly runtime: RuntimeWhatsappHealthRuntime | null;
}
export interface MessagingInboxCounts {
  readonly RECEIVED: number;
  readonly PROCESSING: number;
  readonly PROCESSED: number;
  readonly FAILED: number;
}
export interface MessagingOutboxCounts {
  readonly PENDING: number;
  readonly SENDING: number;
  readonly SENT: number;
  readonly FAILED: number;
  readonly DEAD: number;
}
export interface MessagingInboxMetadata {
  readonly id: string;
  readonly status: MessagingInboxStatus;
  readonly attempts: number;
  readonly receivedAt: string;
  readonly processedAt: string | null;
  readonly processingStartedAt: string | null;
}
export interface MessagingOutboxMetadata {
  readonly id: string;
  readonly status: MessagingOutboxStatus;
  readonly attempts: number;
  readonly nextAttemptAt: string | null;
  readonly createdAt: string;
  readonly sentAt: string | null;
  readonly sendingStartedAt: string | null;
}
export interface MessagingOperationsView {
  readonly inbox: {
    readonly counts: MessagingInboxCounts;
    readonly recent: readonly MessagingInboxMetadata[];
  };
  readonly outbox: {
    readonly counts: MessagingOutboxCounts;
    readonly recent: readonly MessagingOutboxMetadata[];
    readonly deadLetter: readonly MessagingOutboxMetadata[];
  };
}
export interface IncidentRunbookView {
  readonly key: IncidentRunbookKey;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly string[];
  readonly evidenceToCollect: readonly string[];
  readonly escalation: string;
}
export interface IncidentSignalView {
  readonly source: IncidentSignalSource;
  readonly id: string;
  readonly correlationId: string;
  readonly state: IncidentSignalState;
  readonly kind: string;
  readonly targetType: string | null;
  readonly targetId: string | null;
  readonly riskTier: number | null;
  readonly attempts: number | null;
  readonly occurredAt: string;
  readonly runbook: IncidentRunbookView;
}
export interface IncidentCenterView {
  readonly signals: readonly IncidentSignalView[];
}
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER = /^\d+$/;
const SHA40 = /^[0-9a-f]{40}$/;
const RESOURCE_KINDS = ['SPECIES', 'MOVE', 'ITEM', 'AREA', 'ENCOUNTER_TABLE', 'REWARD', 'EFFECT'];
const RELEASE_STATUSES = ['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED'];
const UNPUBLISHED_STATUSES = ['DRAFT', 'VALIDATED'];
const UNPUBLISHED_STATES = ['EDITING', 'READY_TO_PUBLISH'];
const RELEASE_DIFF_CATEGORIES = [
  'types',
  'species',
  'forms',
  'moves',
  'abilities',
  'items',
  'natures',
  'effects',
  'rewards',
  'regions',
  'areas',
  'connections',
  'formAbilities',
  'learnsets',
  'evolutions',
  'starterOptions',
  'purchaseOffers',
  'encounterTables',
];
const RUNTIME_STATES = ['STARTING', 'CONNECTED', 'DISCONNECTED', 'STOPPED', 'INVALIDATED'];
const INBOX_STATES = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'];
const OUTBOX_STATES = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD'];
const INCIDENT_SOURCES = ['ADMIN_OPERATION', 'INBOX', 'OUTBOX'];
const AUDIT_STATUSES = [
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
const AUDIT_KINDS = ['PROPOSED', 'CONFIRMATION', 'APPROVAL', 'CHANGE', 'AUDIT'];
const AUDIT_DECISIONS = ['APPROVED', 'REJECTED'];
const RUNTIME_KEYS = ['environment', 'runtime'];
const RUNTIME_EVIDENCE_KEYS = [
  'providerState',
  'deploymentRevision',
  'startedAt',
  'lastConnectedAt',
  'lastHeartbeatAt',
  'lastDisconnectAt',
  'stoppedAt',
];
const INBOX_COUNT_KEYS = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'];
const OUTBOX_COUNT_KEYS = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD'];
const INBOX_META_KEYS = [
  'id',
  'status',
  'attempts',
  'receivedAt',
  'processedAt',
  'processingStartedAt',
];
const OUTBOX_META_KEYS = [
  'id',
  'status',
  'attempts',
  'nextAttemptAt',
  'createdAt',
  'sentAt',
  'sendingStartedAt',
];
const SIGNAL_KEYS = [
  'source',
  'id',
  'correlationId',
  'state',
  'kind',
  'targetType',
  'targetId',
  'riskTier',
  'attempts',
  'occurredAt',
  'runbook',
];
const RUNBOOK_KEYS = ['key', 'title', 'summary', 'steps', 'evidenceToCollect', 'escalation'];
const AUDIT_OPERATION_KEYS = [
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
const AUDIT_POLICY_KEYS = [
  'version',
  'requiresReason',
  'requiresExpectedRevision',
  'requiresSimulation',
  'requiresConfirmation',
  'requiredApprovals',
];
const AUDIT_EVENT_KEYS = [
  'kind',
  'occurredAt',
  'actorPrincipalId',
  'action',
  'decision',
  'resourceType',
  'resourceId',
  'eventId',
];

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value: unknown, keys: readonly string[]): value is UnknownRecord {
  return record(value) && Object.keys(value).length === keys.length && keys.every((key) => key in value);
}
function uuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
function intText(value: unknown): value is string {
  return typeof value === 'string' && INTEGER.test(value);
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
function iso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}
function nullable(value: unknown, test: (entry: unknown) => boolean): boolean {
  return value === null || test(value);
}
function oneOf(value: unknown, values: readonly string[]): value is string {
  return typeof value === 'string' && values.includes(value);
}
function fail(): never {
  throw new Error('Invalid Admin API response.');
}

function runbookKey(source: string, state: string): IncidentRunbookKey {
  if (source === 'ADMIN_OPERATION' && state === 'FAILED') return 'admin-operation-failed';
  if (source === 'INBOX' && state === 'FAILED') return 'inbox-processing-failed';
  if (source === 'OUTBOX' && state === 'FAILED') return 'outbox-delivery-failed';
  if (source === 'OUTBOX' && state === 'DEAD') return 'outbox-dead-letter';
  return fail();
}

function validateRunbook(value: unknown, source: string, state: string): void {
  if (!exact(value, RUNBOOK_KEYS)) fail();
  const key = runbookKey(source, state);
  const list = (entry: unknown) =>
    Array.isArray(entry) && entry.length > 0 && entry.length <= 8 && entry.every(text);
  if (
    value.key !== key ||
    !text(value.title) ||
    !text(value.summary) ||
    !list(value.steps) ||
    !list(value.evidenceToCollect) ||
    !text(value.escalation)
  ) {
    fail();
  }
}

function contentItem(value: unknown): ContentLibraryItem {
  if (
    !record(value) ||
    !uuid(value.releaseId) ||
    !intText(value.releaseNo) ||
    !text(value.releaseName) ||
    !oneOf(value.releaseStatus, RELEASE_STATUSES) ||
    !intText(value.releaseRevision) ||
    !oneOf(value.resourceKind, RESOURCE_KINDS) ||
    !uuid(value.resourceId) ||
    !text(value.slug) ||
    !text(value.displayName) ||
    typeof value.active !== 'boolean'
  ) {
    fail();
  }
  return {
    releaseId: value.releaseId,
    releaseNo: value.releaseNo,
    releaseName: value.releaseName,
    releaseStatus: value.releaseStatus as ContentReleaseStatus,
    releaseRevision: value.releaseRevision,
    resourceKind: value.resourceKind as ContentResourceKind,
    resourceId: value.resourceId,
    slug: value.slug,
    displayName: value.displayName,
    active: value.active,
  };
}
function contentResult(value: unknown): ContentLibraryResult {
  if (!record(value) || !Array.isArray(value.items) || !nullable(value.nextCursor, text)) fail();
  return { items: value.items.map(contentItem), nextCursor: value.nextCursor as string | null };
}
function unpublishedRow(value: unknown): ContentUnpublishedRelease {
  if (
    !record(value) ||
    !uuid(value.releaseId) ||
    !intText(value.releaseNo) ||
    !text(value.releaseName) ||
    !oneOf(value.status, UNPUBLISHED_STATUSES) ||
    !oneOf(value.workflowState, UNPUBLISHED_STATES) ||
    !intText(value.revision) ||
    !nullable(value.parentReleaseId, uuid) ||
    !text(value.createdAt) ||
    !nullable(value.validatedAt, text) ||
    !intText(value.recordedChangeCount) ||
    !nullable(value.lastChangedAt, text)
  ) {
    fail();
  }
  return {
    releaseId: value.releaseId,
    releaseNo: value.releaseNo,
    releaseName: value.releaseName,
    status: value.status as ContentUnpublishedStatus,
    workflowState: value.workflowState as ContentUnpublishedWorkflowState,
    revision: value.revision,
    parentReleaseId: value.parentReleaseId as string | null,
    createdAt: value.createdAt,
    validatedAt: value.validatedAt as string | null,
    recordedChangeCount: value.recordedChangeCount,
    lastChangedAt: value.lastChangedAt as string | null,
  };
}
function unpublishedResult(value: unknown): readonly ContentUnpublishedRelease[] {
  if (!Array.isArray(value)) fail();
  return value.map(unpublishedRow);
}
function diffSection(value: unknown): ContentReleaseDiffSection {
  if (
    !record(value) ||
    !oneOf(value.category, RELEASE_DIFF_CATEGORIES) ||
    !nonnegative(value.added) ||
    !nonnegative(value.removed) ||
    !nonnegative(value.changed)
  ) {
    fail();
  }
  return {
    category: value.category as ContentReleaseDiffCategory,
    added: value.added,
    removed: value.removed,
    changed: value.changed,
  };
}
function diffResult(value: unknown, expected: ContentReleaseDiffQuery): ContentReleaseDiff {
  if (
    !record(value) ||
    value.fromReleaseId !== expected.fromReleaseId ||
    value.toReleaseId !== expected.toReleaseId ||
    !Array.isArray(value.sections)
  ) {
    fail();
  }
  return { ...expected, sections: value.sections.map(diffSection) };
}
function validationResult(value: unknown, releaseId: string): ContentReleaseValidationPreview {
  if (
    !record(value) ||
    value.releaseId !== releaseId ||
    typeof value.valid !== 'boolean' ||
    !Array.isArray(value.issues)
  ) {
    fail();
  }
  const issues = value.issues.map((issue) => {
    if (!record(issue) || !text(issue.code) || !text(issue.path) || !text(issue.message)) fail();
    return { code: issue.code, path: issue.path, message: issue.message };
  });
  return { releaseId, valid: value.valid, issues };
}
function runtimeResult(value: unknown): RuntimeWhatsappHealthView {
  if (!exact(value, RUNTIME_KEYS) || !oneOf(value.environment, ['development', 'staging', 'production'])) {
    fail();
  }
  if (value.runtime === null) return value as unknown as RuntimeWhatsappHealthView;
  if (!exact(value.runtime, RUNTIME_EVIDENCE_KEYS)) fail();
  const runtime = value.runtime;
  if (
    !oneOf(runtime.providerState, RUNTIME_STATES) ||
    typeof runtime.deploymentRevision !== 'string' ||
    !SHA40.test(runtime.deploymentRevision) ||
    !iso(runtime.startedAt) ||
    !nullable(runtime.lastConnectedAt, iso) ||
    !iso(runtime.lastHeartbeatAt) ||
    !nullable(runtime.lastDisconnectAt, iso) ||
    !nullable(runtime.stoppedAt, iso)
  ) {
    fail();
  }
  return value as unknown as RuntimeWhatsappHealthView;
}
function validateCounts(value: unknown, keys: readonly string[]): void {
  if (!exact(value, keys) || keys.some((key) => !nonnegative(value[key]))) fail();
}
function validateInbox(value: unknown): void {
  if (!exact(value, INBOX_META_KEYS)) fail();
  if (
    !uuid(value.id) ||
    !oneOf(value.status, INBOX_STATES) ||
    !nonnegative(value.attempts) ||
    !iso(value.receivedAt) ||
    !nullable(value.processedAt, iso) ||
    !nullable(value.processingStartedAt, iso)
  ) {
    fail();
  }
}
function validateOutbox(value: unknown): void {
  if (!exact(value, OUTBOX_META_KEYS)) fail();
  if (
    !uuid(value.id) ||
    !oneOf(value.status, OUTBOX_STATES) ||
    !nonnegative(value.attempts) ||
    !nullable(value.nextAttemptAt, iso) ||
    !iso(value.createdAt) ||
    !nullable(value.sentAt, iso) ||
    !nullable(value.sendingStartedAt, iso)
  ) {
    fail();
  }
}
function messagingResult(value: unknown): MessagingOperationsView {
  if (!exact(value, ['inbox', 'outbox'])) fail();
  const inbox = value.inbox;
  const outbox = value.outbox;
  if (!exact(inbox, ['counts', 'recent']) || !exact(outbox, ['counts', 'recent', 'deadLetter'])) {
    fail();
  }
  if (
    !Array.isArray(inbox.recent) ||
    !Array.isArray(outbox.recent) ||
    !Array.isArray(outbox.deadLetter) ||
    inbox.recent.length > 25 ||
    outbox.recent.length > 25 ||
    outbox.deadLetter.length > 25
  ) {
    fail();
  }
  validateCounts(inbox.counts, INBOX_COUNT_KEYS);
  validateCounts(outbox.counts, OUTBOX_COUNT_KEYS);
  inbox.recent.forEach(validateInbox);
  outbox.recent.forEach(validateOutbox);
  outbox.deadLetter.forEach((item) => {
    validateOutbox(item);
    if (!record(item) || item.status !== 'DEAD') fail();
  });
  return value as unknown as MessagingOperationsView;
}
function incidentResult(value: unknown): IncidentCenterView {
  if (!exact(value, ['signals']) || !Array.isArray(value.signals) || value.signals.length > 25) fail();
  for (const signal of value.signals) {
    if (!exact(signal, SIGNAL_KEYS)) fail();
    if (
      !oneOf(signal.source, INCIDENT_SOURCES) ||
      !uuid(signal.id) ||
      !uuid(signal.correlationId) ||
      !oneOf(signal.state, ['FAILED', 'DEAD']) ||
      !text(signal.kind) ||
      !nullable(signal.targetType, text) ||
      !nullable(signal.targetId, uuid) ||
      !nullable(signal.riskTier, nonnegative) ||
      !nullable(signal.attempts, nonnegative) ||
      !iso(signal.occurredAt)
    ) {
      fail();
    }
    if (signal.source === 'ADMIN_OPERATION' && signal.state !== 'FAILED') fail();
    if (signal.source === 'INBOX' && (signal.state !== 'FAILED' || signal.kind !== 'INBOX_MESSAGE')) fail();
    if (signal.source === 'OUTBOX' && signal.kind !== 'OUTBOX_MESSAGE') fail();
    validateRunbook(signal.runbook, signal.source, signal.state);
  }
  return value as unknown as IncidentCenterView;
}
function auditResult(value: unknown, operationId: string): AdminOperationAuditView {
  if (!exact(value, ['operation', 'timeline']) || !Array.isArray(value.timeline)) fail();
  const operation = value.operation;
  if (!exact(operation, AUDIT_OPERATION_KEYS) || !exact(operation.policy, AUDIT_POLICY_KEYS)) fail();
  const policy = operation.policy;
  if (
    operation.id !== operationId ||
    !uuid(operation.id) ||
    !uuid(operation.principalId) ||
    !text(operation.capabilityKey) ||
    !text(operation.operationType) ||
    !text(operation.targetType) ||
    !nullable(operation.targetId, uuid) ||
    !nonnegative(operation.riskTier) ||
    (operation.riskTier as number) > 4 ||
    !oneOf(operation.status, AUDIT_STATUSES) ||
    !uuid(operation.correlationId) ||
    typeof operation.reasonRecorded !== 'boolean' ||
    !nullable(operation.expectedRevision, intText) ||
    !intText(operation.revision) ||
    !iso(operation.createdAt) ||
    !iso(operation.updatedAt) ||
    !nullable(operation.appliedAt, iso) ||
    typeof policy.version !== 'number' ||
    !Number.isInteger(policy.version) ||
    policy.version <= 0 ||
    ['requiresReason', 'requiresExpectedRevision', 'requiresSimulation', 'requiresConfirmation'].some(
      (key) => typeof policy[key] !== 'boolean',
    ) ||
    !nonnegative(policy.requiredApprovals) ||
    (policy.requiredApprovals as number) > 2
  ) {
    fail();
  }
  for (const event of value.timeline) {
    if (!exact(event, AUDIT_EVENT_KEYS)) fail();
    if (
      !oneOf(event.kind, AUDIT_KINDS) ||
      !iso(event.occurredAt) ||
      !nullable(event.actorPrincipalId, uuid) ||
      !text(event.action) ||
      !nullable(event.decision, (entry) => oneOf(entry, AUDIT_DECISIONS)) ||
      !nullable(event.resourceType, text) ||
      !nullable(event.resourceId, uuid) ||
      !uuid(event.eventId)
    ) {
      fail();
    }
  }
  return value as unknown as AdminOperationAuditView;
}

async function parseError(response: Response): Promise<AdminApiError> {
  let code = `HTTP_${response.status}`;
  let message = 'A consulta administrativa falhou.';
  let correlationId = response.headers.get('x-correlation-id');
  try {
    const body: unknown = await response.json();
    if (record(body) && record(body.error)) {
      if (text(body.error.code)) code = body.error.code;
      if (text(body.error.message)) message = body.error.message;
      if (text(body.error.correlationId)) correlationId = body.error.correlationId;
    }
  } catch {
    // Normalized transport error is sufficient for a non-JSON error body.
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
function appendQuery(
  url: URL,
  query: Readonly<Record<string, string | number | boolean | undefined>>,
): void {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
}

export class AdminApiClient {
  private readonly core: CoreAdminApiClient;
  public constructor(
    private readonly apiBaseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.core = new CoreAdminApiClient(apiBaseUrl, fetchImpl);
  }
  public getSession(...args: Parameters<CoreAdminApiClient['getSession']>) {
    return this.core.getSession(...args);
  }
  public searchPlayers(...args: Parameters<CoreAdminApiClient['searchPlayers']>) {
    return this.core.searchPlayers(...args);
  }
  public getPlayer(...args: Parameters<CoreAdminApiClient['getPlayer']>) {
    return this.core.getPlayer(...args);
  }
  public prepareOperation(...args: Parameters<CoreAdminApiClient['prepareOperation']>) {
    return this.core.prepareOperation(...args);
  }

  private async read<T>(
    url: URL | string,
    validate: (value: unknown) => T,
    invalidCode: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(String(url), {
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
    if (!response.ok) throw await parseError(response);
    try {
      return validate(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta administrativa é inválida.',
        200,
        invalidCode,
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public searchContent(query: ContentLibraryQuery, cursor?: string): Promise<ContentLibraryResult> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content`);
    appendQuery(url, { ...query, cursor });
    return this.read(url, contentResult, 'INVALID_CONTENT_LIBRARY_RESPONSE');
  }
  public listUnpublishedContent(): Promise<readonly ContentUnpublishedRelease[]> {
    return this.read(
      `${this.apiBaseUrl}/admin/v1/content/unpublished`,
      unpublishedResult,
      'INVALID_UNPUBLISHED_CONTENT_RESPONSE',
    );
  }
  public diffContentRelease(query: ContentReleaseDiffQuery): Promise<ContentReleaseDiff> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content/releases/diff`);
    appendQuery(url, query);
    return this.read(url, (value) => diffResult(value, query), 'INVALID_CONTENT_RELEASE_DIFF_RESPONSE');
  }
  public previewContentReleaseValidation(releaseId: string): Promise<ContentReleaseValidationPreview> {
    return this.read(
      `${this.apiBaseUrl}/admin/v1/content/releases/${releaseId}/validation`,
      (value) => validationResult(value, releaseId),
      'INVALID_CONTENT_RELEASE_VALIDATION_RESPONSE',
    );
  }
  public getRuntimeWhatsappHealth(): Promise<RuntimeWhatsappHealthView> {
    return this.read(
      `${this.apiBaseUrl}/admin/v1/runtime/whatsapp/health`,
      runtimeResult,
      'INVALID_RUNTIME_HEALTH_RESPONSE',
    );
  }
  public getMessagingOperations(): Promise<MessagingOperationsView> {
    return this.read(
      `${this.apiBaseUrl}/admin/v1/messaging/operations`,
      messagingResult,
      'INVALID_MESSAGING_OPERATIONS_RESPONSE',
    );
  }
  public getIncidentCenter(): Promise<IncidentCenterView> {
    return this.read(
      `${this.apiBaseUrl}/admin/v1/incidents`,
      incidentResult,
      'INVALID_INCIDENT_CENTER_RESPONSE',
    );
  }
  public getAdminOperationAudit(operationId: string): Promise<AdminOperationAuditView> {
    if (!uuid(operationId)) {
      throw new AdminApiError(
        'invalid',
        'O ID da operação administrativa é inválido.',
        400,
        'INVALID_ADMIN_OPERATION_ID',
        null,
      );
    }
    return this.read(
      `${this.apiBaseUrl}/admin/v1/operations/${operationId}/audit`,
      (value) => auditResult(value, operationId),
      'INVALID_ADMIN_OPERATION_AUDIT_RESPONSE',
    );
  }
}
