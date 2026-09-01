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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_STRING_PATTERN = /^\d+$/;
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
}
