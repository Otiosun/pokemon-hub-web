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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_STRING_PATTERN = /^\d+$/;
const DEPLOYMENT_REVISION_PATTERN = /^[0-9a-f]{40}$/;
const RESOURCE_KINDS = new Set<ContentResourceKind>([
  'SPECIES',
  'MOVE',
  'ITEM',
  'AREA',
  'ENCOUNTER_TABLE',
  'REWARD',
  'EFFECT',
]);
const RELEASE_STATUSES = new Set<ContentReleaseStatus>([
  'DRAFT',
  'VALIDATED',
  'PUBLISHED',
  'ARCHIVED',
]);
const UNPUBLISHED_STATUSES = new Set<ContentUnpublishedStatus>(['DRAFT', 'VALIDATED']);
const UNPUBLISHED_WORKFLOW_STATES = new Set<ContentUnpublishedWorkflowState>([
  'EDITING',
  'READY_TO_PUBLISH',
]);
const RELEASE_DIFF_CATEGORIES = new Set<ContentReleaseDiffCategory>([
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
]);
const RUNTIME_PROVIDER_STATES = new Set<RuntimeWhatsappProviderState>([
  'STARTING',
  'CONNECTED',
  'DISCONNECTED',
  'STOPPED',
  'INVALIDATED',
]);
const MESSAGING_INBOX_STATUSES = new Set<MessagingInboxStatus>([
  'RECEIVED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
]);
const MESSAGING_OUTBOX_STATUSES = new Set<MessagingOutboxStatus>([
  'PENDING',
  'SENDING',
  'SENT',
  'FAILED',
  'DEAD',
]);
const INCIDENT_SIGNAL_SOURCES = new Set<IncidentSignalSource>([
  'ADMIN_OPERATION',
  'INBOX',
  'OUTBOX',
]);
const INCIDENT_SIGNAL_STATES = new Set<IncidentSignalState>(['FAILED', 'DEAD']);
const INCIDENT_RUNBOOK_KEY_VALUES = new Set<IncidentRunbookKey>([
  'admin-operation-failed',
  'inbox-processing-failed',
  'outbox-delivery-failed',
  'outbox-dead-letter',
]);
const RUNTIME_HEALTH_KEYS = ['environment', 'runtime'] as const;
const RUNTIME_HEALTH_RUNTIME_KEYS = [
  'providerState',
  'deploymentRevision',
  'startedAt',
  'lastConnectedAt',
  'lastHeartbeatAt',
  'lastDisconnectAt',
  'stoppedAt',
] as const;
const MESSAGING_OPERATIONS_KEYS = ['inbox', 'outbox'] as const;
const MESSAGING_INBOX_KEYS = ['counts', 'recent'] as const;
const MESSAGING_OUTBOX_KEYS = ['counts', 'recent', 'deadLetter'] as const;
const MESSAGING_INBOX_COUNT_KEYS = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const;
const MESSAGING_OUTBOX_COUNT_KEYS = ['PENDING', 'SENDING', 'SENT', 'FAILED', 'DEAD'] as const;
const MESSAGING_INBOX_METADATA_KEYS = [
  'id',
  'status',
  'attempts',
  'receivedAt',
  'processedAt',
  'processingStartedAt',
] as const;
const MESSAGING_OUTBOX_METADATA_KEYS = [
  'id',
  'status',
  'attempts',
  'nextAttemptAt',
  'createdAt',
  'sentAt',
  'sendingStartedAt',
] as const;
const INCIDENT_CENTER_KEYS = ['signals'] as const;
const INCIDENT_SIGNAL_KEYS = [
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
] as const;
const INCIDENT_RUNBOOK_KEYS = [
  'key',
  'title',
  'summary',
  'steps',
  'evidenceToCollect',
  'escalation',
] as const;
const MESSAGING_RECENT_LIMIT = 25;
const INCIDENT_RECENT_LIMIT = 25;
const INCIDENT_RUNBOOK_LIST_LIMIT = 8;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isIntegerString(value: unknown): value is string {
  return typeof value === 'string' && INTEGER_STRING_PATTERN.test(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNonEmptyStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= INCIDENT_RUNBOOK_LIST_LIMIT &&
    value.every(isNonEmptyString)
  );
}

function hasExactKeys(value: UnknownRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isNullableCanonicalIsoTimestamp(value: unknown): value is string | null {
  return value === null || isCanonicalIsoTimestamp(value);
}

function isRuntimeProviderState(value: unknown): value is RuntimeWhatsappProviderState {
  if (typeof value !== 'string') return false;
  return RUNTIME_PROVIDER_STATES.has(value as RuntimeWhatsappProviderState);
}

function isMessagingInboxStatus(value: unknown): value is MessagingInboxStatus {
  return typeof value === 'string' && MESSAGING_INBOX_STATUSES.has(value as MessagingInboxStatus);
}

function isMessagingOutboxStatus(value: unknown): value is MessagingOutboxStatus {
  return typeof value === 'string' && MESSAGING_OUTBOX_STATUSES.has(value as MessagingOutboxStatus);
}

function isIncidentSignalSource(value: unknown): value is IncidentSignalSource {
  return typeof value === 'string' && INCIDENT_SIGNAL_SOURCES.has(value as IncidentSignalSource);
}

function isIncidentSignalState(value: unknown): value is IncidentSignalState {
  return typeof value === 'string' && INCIDENT_SIGNAL_STATES.has(value as IncidentSignalState);
}

function expectedIncidentRunbookKey(
  source: IncidentSignalSource,
  state: IncidentSignalState,
): IncidentRunbookKey {
  if (source === 'ADMIN_OPERATION' && state === 'FAILED') return 'admin-operation-failed';
  if (source === 'INBOX' && state === 'FAILED') return 'inbox-processing-failed';
  if (source === 'OUTBOX' && state === 'FAILED') return 'outbox-delivery-failed';
  if (source === 'OUTBOX' && state === 'DEAD') return 'outbox-dead-letter';
  throw new Error('Invalid Incident Center runbook mapping.');
}

function assertIncidentRunbook(
  value: unknown,
  source: IncidentSignalSource,
  state: IncidentSignalState,
): IncidentRunbookView {
  if (!isRecord(value) || !hasExactKeys(value, INCIDENT_RUNBOOK_KEYS)) {
    throw new Error('Invalid Incident Center runbook.');
  }

  const expectedKey = expectedIncidentRunbookKey(source, state);
  if (
    typeof value.key !== 'string' ||
    !INCIDENT_RUNBOOK_KEY_VALUES.has(value.key as IncidentRunbookKey) ||
    value.key !== expectedKey ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.summary) ||
    !isNonEmptyStringList(value.steps) ||
    !isNonEmptyStringList(value.evidenceToCollect) ||
    !isNonEmptyString(value.escalation)
  ) {
    throw new Error('Invalid Incident Center runbook.');
  }

  return {
    key: expectedKey,
    title: value.title,
    summary: value.summary,
    steps: [...value.steps],
    evidenceToCollect: [...value.evidenceToCollect],
    escalation: value.escalation,
  };
}

function isResourceKind(value: unknown): value is ContentResourceKind {
  return typeof value === 'string' && RESOURCE_KINDS.has(value as ContentResourceKind);
}

function isReleaseStatus(value: unknown): value is ContentReleaseStatus {
  return typeof value === 'string' && RELEASE_STATUSES.has(value as ContentReleaseStatus);
}

function isUnpublishedStatus(value: unknown): value is ContentUnpublishedStatus {
  return typeof value === 'string' && UNPUBLISHED_STATUSES.has(value as ContentUnpublishedStatus);
}

function isUnpublishedWorkflowState(value: unknown): value is ContentUnpublishedWorkflowState {
  return (
    typeof value === 'string' &&
    UNPUBLISHED_WORKFLOW_STATES.has(value as ContentUnpublishedWorkflowState)
  );
}

function isReleaseDiffCategory(value: unknown): value is ContentReleaseDiffCategory {
  return (
    typeof value === 'string' && RELEASE_DIFF_CATEGORIES.has(value as ContentReleaseDiffCategory)
  );
}

function assertContentLibraryItem(value: unknown): ContentLibraryItem {
  if (
    !isRecord(value) ||
    !isUuid(value.releaseId) ||
    !isIntegerString(value.releaseNo) ||
    !isNonEmptyString(value.releaseName) ||
    !isReleaseStatus(value.releaseStatus) ||
    !isIntegerString(value.releaseRevision) ||
    !isResourceKind(value.resourceKind) ||
    !isUuid(value.resourceId) ||
    !isNonEmptyString(value.slug) ||
    !isNonEmptyString(value.displayName) ||
    typeof value.active !== 'boolean'
  ) {
    throw new Error('Invalid content library item.');
  }

  return {
    releaseId: value.releaseId,
    releaseNo: value.releaseNo,
    releaseName: value.releaseName,
    releaseStatus: value.releaseStatus,
    releaseRevision: value.releaseRevision,
    resourceKind: value.resourceKind,
    resourceId: value.resourceId,
    slug: value.slug,
    displayName: value.displayName,
    active: value.active,
  };
}

function assertContentLibraryResult(value: unknown): ContentLibraryResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  ) {
    throw new Error('Invalid content library response.');
  }
  return {
    items: value.items.map(assertContentLibraryItem),
    nextCursor: value.nextCursor,
  };
}

function assertUnpublishedRelease(value: unknown): ContentUnpublishedRelease {
  if (
    !isRecord(value) ||
    !isUuid(value.releaseId) ||
    !isIntegerString(value.releaseNo) ||
    !isNonEmptyString(value.releaseName) ||
    !isUnpublishedStatus(value.status) ||
    !isUnpublishedWorkflowState(value.workflowState) ||
    !isIntegerString(value.revision) ||
    (value.parentReleaseId !== null && !isUuid(value.parentReleaseId)) ||
    !isNonEmptyString(value.createdAt) ||
    (value.validatedAt !== null && !isNonEmptyString(value.validatedAt)) ||
    !isIntegerString(value.recordedChangeCount) ||
    (value.lastChangedAt !== null && !isNonEmptyString(value.lastChangedAt))
  ) {
    throw new Error('Invalid unpublished content release.');
  }

  return {
    releaseId: value.releaseId,
    releaseNo: value.releaseNo,
    releaseName: value.releaseName,
    status: value.status,
    workflowState: value.workflowState,
    revision: value.revision,
    parentReleaseId: value.parentReleaseId,
    createdAt: value.createdAt,
    validatedAt: value.validatedAt,
    recordedChangeCount: value.recordedChangeCount,
    lastChangedAt: value.lastChangedAt,
  };
}

function assertUnpublishedContentResult(value: unknown): readonly ContentUnpublishedRelease[] {
  if (!Array.isArray(value)) throw new Error('Invalid unpublished content response.');
  return value.map(assertUnpublishedRelease);
}

function assertReleaseDiffSection(value: unknown): ContentReleaseDiffSection {
  if (
    !isRecord(value) ||
    !isReleaseDiffCategory(value.category) ||
    !isNonNegativeInteger(value.added) ||
    !isNonNegativeInteger(value.removed) ||
    !isNonNegativeInteger(value.changed)
  ) {
    throw new Error('Invalid content release diff section.');
  }

  return {
    category: value.category,
    added: value.added,
    removed: value.removed,
    changed: value.changed,
  };
}

function assertContentReleaseDiff(
  value: unknown,
  expected: ContentReleaseDiffQuery,
): ContentReleaseDiff {
  if (
    !isRecord(value) ||
    value.fromReleaseId !== expected.fromReleaseId ||
    value.toReleaseId !== expected.toReleaseId ||
    !Array.isArray(value.sections)
  ) {
    throw new Error('Invalid content release diff response.');
  }

  return {
    fromReleaseId: expected.fromReleaseId,
    toReleaseId: expected.toReleaseId,
    sections: value.sections.map(assertReleaseDiffSection),
  };
}

function assertContentReleaseValidationIssue(value: unknown): ContentReleaseValidationIssue {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.code) ||
    !isNonEmptyString(value.path) ||
    !isNonEmptyString(value.message)
  ) {
    throw new Error('Invalid content release validation issue.');
  }
  return { code: value.code, path: value.path, message: value.message };
}

function assertContentReleaseValidationPreview(
  value: unknown,
  expectedReleaseId: string,
): ContentReleaseValidationPreview {
  if (
    !isRecord(value) ||
    value.releaseId !== expectedReleaseId ||
    typeof value.valid !== 'boolean' ||
    !Array.isArray(value.issues)
  ) {
    throw new Error('Invalid content release validation preview response.');
  }
  return {
    releaseId: expectedReleaseId,
    valid: value.valid,
    issues: value.issues.map(assertContentReleaseValidationIssue),
  };
}

function assertRuntimeWhatsappHealth(value: unknown): RuntimeWhatsappHealthView {
  if (!isRecord(value) || !hasExactKeys(value, RUNTIME_HEALTH_KEYS)) {
    throw new Error('Invalid runtime WhatsApp health response.');
  }
  if (
    value.environment !== 'development' &&
    value.environment !== 'staging' &&
    value.environment !== 'production'
  ) {
    throw new Error('Invalid runtime WhatsApp health environment.');
  }
  if (value.runtime === null) {
    return { environment: value.environment, runtime: null };
  }
  if (!isRecord(value.runtime) || !hasExactKeys(value.runtime, RUNTIME_HEALTH_RUNTIME_KEYS)) {
    throw new Error('Invalid runtime WhatsApp health evidence.');
  }

  const runtime = value.runtime;
  if (
    !isRuntimeProviderState(runtime.providerState) ||
    typeof runtime.deploymentRevision !== 'string' ||
    !DEPLOYMENT_REVISION_PATTERN.test(runtime.deploymentRevision) ||
    !isCanonicalIsoTimestamp(runtime.startedAt) ||
    !isNullableCanonicalIsoTimestamp(runtime.lastConnectedAt) ||
    !isCanonicalIsoTimestamp(runtime.lastHeartbeatAt) ||
    !isNullableCanonicalIsoTimestamp(runtime.lastDisconnectAt) ||
    !isNullableCanonicalIsoTimestamp(runtime.stoppedAt)
  ) {
    throw new Error('Invalid runtime WhatsApp health evidence.');
  }

  return {
    environment: value.environment,
    runtime: {
      providerState: runtime.providerState,
      deploymentRevision: runtime.deploymentRevision,
      startedAt: runtime.startedAt,
      lastConnectedAt: runtime.lastConnectedAt,
      lastHeartbeatAt: runtime.lastHeartbeatAt,
      lastDisconnectAt: runtime.lastDisconnectAt,
      stoppedAt: runtime.stoppedAt,
    },
  };
}

function assertMessagingInboxCounts(value: unknown): MessagingInboxCounts {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGING_INBOX_COUNT_KEYS)) {
    throw new Error('Invalid messaging inbox counts.');
  }
  if (
    !isNonNegativeInteger(value.RECEIVED) ||
    !isNonNegativeInteger(value.PROCESSING) ||
    !isNonNegativeInteger(value.PROCESSED) ||
    !isNonNegativeInteger(value.FAILED)
  ) {
    throw new Error('Invalid messaging inbox counts.');
  }
  return {
    RECEIVED: value.RECEIVED,
    PROCESSING: value.PROCESSING,
    PROCESSED: value.PROCESSED,
    FAILED: value.FAILED,
  };
}

function assertMessagingOutboxCounts(value: unknown): MessagingOutboxCounts {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGING_OUTBOX_COUNT_KEYS)) {
    throw new Error('Invalid messaging outbox counts.');
  }
  if (
    !isNonNegativeInteger(value.PENDING) ||
    !isNonNegativeInteger(value.SENDING) ||
    !isNonNegativeInteger(value.SENT) ||
    !isNonNegativeInteger(value.FAILED) ||
    !isNonNegativeInteger(value.DEAD)
  ) {
    throw new Error('Invalid messaging outbox counts.');
  }
  return {
    PENDING: value.PENDING,
    SENDING: value.SENDING,
    SENT: value.SENT,
    FAILED: value.FAILED,
    DEAD: value.DEAD,
  };
}

function assertMessagingInboxMetadata(value: unknown): MessagingInboxMetadata {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGING_INBOX_METADATA_KEYS)) {
    throw new Error('Invalid messaging inbox metadata.');
  }
  if (
    !isUuid(value.id) ||
    !isMessagingInboxStatus(value.status) ||
    !isNonNegativeInteger(value.attempts) ||
    !isCanonicalIsoTimestamp(value.receivedAt) ||
    !isNullableCanonicalIsoTimestamp(value.processedAt) ||
    !isNullableCanonicalIsoTimestamp(value.processingStartedAt)
  ) {
    throw new Error('Invalid messaging inbox metadata.');
  }
  return {
    id: value.id,
    status: value.status,
    attempts: value.attempts,
    receivedAt: value.receivedAt,
    processedAt: value.processedAt,
    processingStartedAt: value.processingStartedAt,
  };
}

function assertMessagingOutboxMetadata(value: unknown): MessagingOutboxMetadata {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGING_OUTBOX_METADATA_KEYS)) {
    throw new Error('Invalid messaging outbox metadata.');
  }
  if (
    !isUuid(value.id) ||
    !isMessagingOutboxStatus(value.status) ||
    !isNonNegativeInteger(value.attempts) ||
    !isNullableCanonicalIsoTimestamp(value.nextAttemptAt) ||
    !isCanonicalIsoTimestamp(value.createdAt) ||
    !isNullableCanonicalIsoTimestamp(value.sentAt) ||
    !isNullableCanonicalIsoTimestamp(value.sendingStartedAt)
  ) {
    throw new Error('Invalid messaging outbox metadata.');
  }
  return {
    id: value.id,
    status: value.status,
    attempts: value.attempts,
    nextAttemptAt: value.nextAttemptAt,
    createdAt: value.createdAt,
    sentAt: value.sentAt,
    sendingStartedAt: value.sendingStartedAt,
  };
}

function assertMessagingOperations(value: unknown): MessagingOperationsView {
  if (!isRecord(value) || !hasExactKeys(value, MESSAGING_OPERATIONS_KEYS)) {
    throw new Error('Invalid messaging operations response.');
  }
  if (
    !isRecord(value.inbox) ||
    !hasExactKeys(value.inbox, MESSAGING_INBOX_KEYS) ||
    !Array.isArray(value.inbox.recent) ||
    value.inbox.recent.length > MESSAGING_RECENT_LIMIT ||
    !isRecord(value.outbox) ||
    !hasExactKeys(value.outbox, MESSAGING_OUTBOX_KEYS) ||
    !Array.isArray(value.outbox.recent) ||
    !Array.isArray(value.outbox.deadLetter) ||
    value.outbox.recent.length > MESSAGING_RECENT_LIMIT ||
    value.outbox.deadLetter.length > MESSAGING_RECENT_LIMIT
  ) {
    throw new Error('Invalid messaging operations response.');
  }

  const deadLetter = value.outbox.deadLetter.map(assertMessagingOutboxMetadata);
  if (deadLetter.some((item) => item.status !== 'DEAD')) {
    throw new Error('Invalid messaging dead-letter metadata.');
  }

  return {
    inbox: {
      counts: assertMessagingInboxCounts(value.inbox.counts),
      recent: value.inbox.recent.map(assertMessagingInboxMetadata),
    },
    outbox: {
      counts: assertMessagingOutboxCounts(value.outbox.counts),
      recent: value.outbox.recent.map(assertMessagingOutboxMetadata),
      deadLetter,
    },
  };
}

function assertIncidentSignal(value: unknown): IncidentSignalView {
  if (!isRecord(value) || !hasExactKeys(value, INCIDENT_SIGNAL_KEYS)) {
    throw new Error('Invalid Incident Center signal.');
  }
  if (
    !isIncidentSignalSource(value.source) ||
    !isUuid(value.id) ||
    !isUuid(value.correlationId) ||
    !isIncidentSignalState(value.state) ||
    !isNonEmptyString(value.kind) ||
    (value.targetType !== null && !isNonEmptyString(value.targetType)) ||
    (value.targetId !== null && !isUuid(value.targetId)) ||
    (value.riskTier !== null && !isNonNegativeInteger(value.riskTier)) ||
    (value.attempts !== null && !isNonNegativeInteger(value.attempts)) ||
    !isCanonicalIsoTimestamp(value.occurredAt)
  ) {
    throw new Error('Invalid Incident Center signal.');
  }

  if (value.source === 'ADMIN_OPERATION' && value.state !== 'FAILED') {
    throw new Error('Invalid administrative incident state.');
  }
  if (value.source === 'INBOX' && (value.state !== 'FAILED' || value.kind !== 'INBOX_MESSAGE')) {
    throw new Error('Invalid inbox incident signal.');
  }
  if (value.source === 'OUTBOX' && value.kind !== 'OUTBOX_MESSAGE') {
    throw new Error('Invalid outbox incident signal.');
  }

  const runbook = assertIncidentRunbook(value.runbook, value.source, value.state);

  return {
    source: value.source,
    id: value.id,
    correlationId: value.correlationId,
    state: value.state,
    kind: value.kind,
    targetType: value.targetType,
    targetId: value.targetId,
    riskTier: value.riskTier,
    attempts: value.attempts,
    occurredAt: value.occurredAt,
    runbook,
  };
}

function assertIncidentCenter(value: unknown): IncidentCenterView {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, INCIDENT_CENTER_KEYS) ||
    !Array.isArray(value.signals) ||
    value.signals.length > INCIDENT_RECENT_LIMIT
  ) {
    throw new Error('Invalid Incident Center response.');
  }
  return { signals: value.signals.map(assertIncidentSignal) };
}

async function parseContentError(response: Response): Promise<AdminApiError> {
  let code = `HTTP_${response.status}`;
  let message = 'A consulta administrativa falhou.';
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

function appendQuery(
  url: URL,
  query: Readonly<Record<string, string | number | boolean | undefined>>,
): void {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
}

/**
 * Stable façade over the existing Admin API client. Content Library is added
 * here without duplicating or weakening the proven Player 360 / PREPARE code.
 */
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

  public async searchContent(
    query: ContentLibraryQuery,
    cursor?: string,
  ): Promise<ContentLibraryResult> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content`);
    appendQuery(url, { ...query, cursor });

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertContentLibraryResult(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta da biblioteca de conteúdo é inválida.',
        200,
        'INVALID_CONTENT_LIBRARY_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async listUnpublishedContent(): Promise<readonly ContentUnpublishedRelease[]> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content/unpublished`);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertUnpublishedContentResult(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta do estado não publicado é inválida.',
        200,
        'INVALID_UNPUBLISHED_CONTENT_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async diffContentRelease(query: ContentReleaseDiffQuery): Promise<ContentReleaseDiff> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content/releases/diff`);
    appendQuery(url, {
      fromReleaseId: query.fromReleaseId,
      toReleaseId: query.toReleaseId,
    });

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertContentReleaseDiff(await response.json(), query);
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta do comparativo de releases é inválida.',
        200,
        'INVALID_CONTENT_RELEASE_DIFF_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async previewContentReleaseValidation(
    releaseId: string,
  ): Promise<ContentReleaseValidationPreview> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/content/releases/${releaseId}/validation`);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertContentReleaseValidationPreview(await response.json(), releaseId);
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta da pré-validação de conteúdo é inválida.',
        200,
        'INVALID_CONTENT_RELEASE_VALIDATION_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async getRuntimeWhatsappHealth(): Promise<RuntimeWhatsappHealthView> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/runtime/whatsapp/health`);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertRuntimeWhatsappHealth(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta de saúde do runtime WhatsApp é inválida.',
        200,
        'INVALID_RUNTIME_HEALTH_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async getMessagingOperations(): Promise<MessagingOperationsView> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/messaging/operations`);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertMessagingOperations(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta das filas de mensageria é inválida.',
        200,
        'INVALID_MESSAGING_OPERATIONS_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async getIncidentCenter(): Promise<IncidentCenterView> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/incidents`);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
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

    if (!response.ok) throw await parseContentError(response);
    try {
      return assertIncidentCenter(await response.json());
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta do Incident Center é inválida.',
        200,
        'INVALID_INCIDENT_CENTER_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }
}
