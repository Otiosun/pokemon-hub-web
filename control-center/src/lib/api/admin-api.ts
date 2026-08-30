import type { PlayerSearchQuery } from '../../features/player360/model';

export type AdminEnvironment = 'development' | 'staging' | 'production';

export interface AdminSessionCapability {
  readonly key: string;
  readonly riskTier: 0 | 1 | 2 | 3 | 4;
}

export interface AdminSessionScope {
  readonly scopeType: 'GLOBAL' | 'PLAYER' | 'REGION' | 'AREA';
  readonly scopeId: string | null;
}

export interface AdminSession {
  readonly principalId: string;
  readonly roles: readonly string[];
  readonly capabilities: readonly AdminSessionCapability[];
  readonly scopes: readonly AdminSessionScope[];
  readonly environment: AdminEnvironment;
}

export interface PlayerSearchIdentity {
  readonly provider: string;
  readonly externalId: string | null;
  readonly status: 'ACTIVE' | 'REVOKED';
  readonly createdAt: string;
  readonly revokedAt: string | null;
}

export interface PlayerSearchItem {
  readonly playerId: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  readonly trainerName: string | null;
  readonly originRegionId: string | null;
  readonly trainerLevel: number;
  readonly insigniaPoints: string;
  readonly areaId: string | null;
  readonly activeEncounterId: string | null;
  readonly activeEncounterStatus: string | null;
  readonly activeBattleId: string | null;
  readonly activeBattleStatus: string | null;
  readonly identities: readonly PlayerSearchIdentity[];
  readonly createdAt: string;
}

export interface PlayerSearchResult {
  readonly items: readonly PlayerSearchItem[];
  readonly nextCursor: string | null;
}

export interface Player360Overview {
  readonly playerId: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly playerRevision: string;
  readonly profile: {
    readonly trainerName: string | null;
    readonly originRegionId: string | null;
    readonly locale: string | null;
    readonly revision: string | null;
  };
  readonly onboarding: {
    readonly state: string | null;
    readonly completedAt: string | null;
    readonly revision: string | null;
    readonly contentReleaseId: string | null;
    readonly rulesetId: string | null;
  };
  readonly progression: {
    readonly level: number;
    readonly insigniaPoints: string;
    readonly revision: string;
    readonly unlocks: readonly unknown[];
  };
  readonly location: {
    readonly areaId: string | null;
    readonly enteredAt: string | null;
    readonly revision: string | null;
  };
  readonly identities: readonly PlayerSearchIdentity[];
  readonly wallets: readonly unknown[];
  readonly inventory: readonly unknown[];
  readonly pokemon: readonly unknown[];
  readonly pokedex: {
    readonly speciesSeen: number;
    readonly speciesCaught: number;
    readonly entries: readonly unknown[];
  };
  readonly activeEncounter: unknown | null;
  readonly activeBattle: unknown | null;
  readonly effects: readonly unknown[];
  readonly recentActivity: readonly unknown[];
  readonly unsupportedSections: readonly ['COOLDOWNS', 'PUNISHMENTS_FLAGS'];
}

export interface AdminPrepareOperationRequest {
  readonly operationType: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly reason?: string;
  readonly expectedRevision?: string;
  readonly idempotencyKey: string;
}

export interface AdminPreparedOperationPolicy {
  readonly version: number;
  readonly requiresReason: boolean;
  readonly requiresExpectedRevision: boolean;
  readonly requiresSimulation: boolean;
  readonly requiresConfirmation: boolean;
  readonly requiredApprovals: number;
}

export interface AdminPreparedOperationSummary {
  readonly id: string;
  readonly operationType: string;
  readonly target: {
    readonly type: string;
    readonly id: string | null;
  };
  readonly riskTier: 0 | 1 | 2 | 3 | 4;
  readonly authorizationMode: 'GLOBAL_ONLY' | 'SUBJECT';
  readonly status:
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
  readonly reason: string | null;
  readonly expectedRevision: string | null;
  readonly correlationId: string;
  readonly policy: AdminPreparedOperationPolicy;
  readonly revision: string;
}

export interface AdminPrepareOperationResult {
  readonly operation: AdminPreparedOperationSummary;
  readonly replayed: boolean;
}

export type AdminApiErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'network';

export class AdminApiError extends Error {
  override readonly name = 'AdminApiError';

  public constructor(
    readonly kind: AdminApiErrorKind,
    message: string,
    readonly status: number | null,
    readonly code: string,
    readonly correlationId: string | null,
  ) {
    super(message);
  }
}

interface ErrorEnvelope {
  readonly error?: {
    readonly code?: unknown;
    readonly message?: unknown;
    readonly correlationId?: unknown;
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;
const ADMIN_OPERATION_STATUSES = new Set([
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

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNonNegativeIntegerString(value: unknown): value is string {
  return typeof value === 'string' && NON_NEGATIVE_INTEGER_PATTERN.test(value);
}

function kindForStatus(status: number): AdminApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 400) return 'invalid';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  return 'server';
}

function assertSession(value: unknown): AdminSession {
  if (!isRecord(value)) throw new Error('Invalid Admin API session response.');
  const principalId = stringValue(value.principalId);
  const environment = value.environment;
  if (
    principalId === null ||
    (environment !== 'development' && environment !== 'staging' && environment !== 'production') ||
    !Array.isArray(value.roles) ||
    !value.roles.every((role) => typeof role === 'string') ||
    !Array.isArray(value.capabilities) ||
    !Array.isArray(value.scopes)
  ) {
    throw new Error('Invalid Admin API session response.');
  }

  const capabilities = value.capabilities.map((capability) => {
    if (!isRecord(capability)) throw new Error('Invalid Admin API session capability.');
    const key = stringValue(capability.key);
    const riskTier = capability.riskTier;
    if (
      key === null ||
      !Number.isInteger(riskTier) ||
      Number(riskTier) < 0 ||
      Number(riskTier) > 4
    ) {
      throw new Error('Invalid Admin API session capability.');
    }
    return { key, riskTier: riskTier as 0 | 1 | 2 | 3 | 4 };
  });

  const scopes = value.scopes.map((scope) => {
    if (!isRecord(scope)) throw new Error('Invalid Admin API session scope.');
    const scopeType = scope.scopeType;
    const scopeId = scope.scopeId;
    if (
      (scopeType !== 'GLOBAL' &&
        scopeType !== 'PLAYER' &&
        scopeType !== 'REGION' &&
        scopeType !== 'AREA') ||
      (scopeId !== null && typeof scopeId !== 'string')
    ) {
      throw new Error('Invalid Admin API session scope.');
    }
    return { scopeType, scopeId } as AdminSessionScope;
  });

  return {
    principalId,
    roles: [...value.roles],
    capabilities,
    scopes,
    environment,
  };
}

function assertPlayerSearchResult(value: unknown): PlayerSearchResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  ) {
    throw new Error('Invalid player search response.');
  }
  return value as unknown as PlayerSearchResult;
}

function assertPlayer360(value: unknown): Player360Overview {
  if (!isRecord(value) || typeof value.playerId !== 'string' || typeof value.status !== 'string') {
    throw new Error('Invalid Player 360 response.');
  }
  return value as unknown as Player360Overview;
}

function assertPreparedOperation(value: unknown): AdminPrepareOperationResult {
  if (!isRecord(value) || typeof value.replayed !== 'boolean' || !isRecord(value.operation)) {
    throw new Error('Invalid prepared operation response.');
  }
  const operation = value.operation;
  const target = operation.target;
  const policy = operation.policy;
  if (
    !isUuid(operation.id) ||
    stringValue(operation.operationType) === null ||
    !isRecord(target) ||
    stringValue(target.type) === null ||
    (target.id !== null && typeof target.id !== 'string') ||
    !Number.isInteger(operation.riskTier) ||
    Number(operation.riskTier) < 0 ||
    Number(operation.riskTier) > 4 ||
    (operation.authorizationMode !== 'GLOBAL_ONLY' && operation.authorizationMode !== 'SUBJECT') ||
    typeof operation.status !== 'string' ||
    !ADMIN_OPERATION_STATUSES.has(operation.status) ||
    (operation.reason !== null && typeof operation.reason !== 'string') ||
    (operation.expectedRevision !== null &&
      !isNonNegativeIntegerString(operation.expectedRevision)) ||
    !isUuid(operation.correlationId) ||
    !isRecord(policy) ||
    !Number.isInteger(policy.version) ||
    Number(policy.version) <= 0 ||
    typeof policy.requiresReason !== 'boolean' ||
    typeof policy.requiresExpectedRevision !== 'boolean' ||
    typeof policy.requiresSimulation !== 'boolean' ||
    typeof policy.requiresConfirmation !== 'boolean' ||
    !Number.isInteger(policy.requiredApprovals) ||
    Number(policy.requiredApprovals) < 0 ||
    Number(policy.requiredApprovals) > 2 ||
    !isNonNegativeIntegerString(operation.revision)
  ) {
    throw new Error('Invalid prepared operation response.');
  }
  return value as unknown as AdminPrepareOperationResult;
}

async function parseError(response: Response): Promise<AdminApiError> {
  let envelope: ErrorEnvelope = {};
  try {
    const value: unknown = await response.json();
    if (isRecord(value)) envelope = value as ErrorEnvelope;
  } catch {
    // Transport errors are intentionally normalized below.
  }
  const bodyCorrelation = stringValue(envelope.error?.correlationId);
  const headerCorrelation = stringValue(response.headers.get('x-correlation-id'));
  return new AdminApiError(
    kindForStatus(response.status),
    stringValue(envelope.error?.message) ?? 'A operação administrativa falhou.',
    response.status,
    stringValue(envelope.error?.code) ?? `HTTP_${response.status}`,
    bodyCorrelation ?? headerCorrelation,
  );
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
  public constructor(
    private readonly apiBaseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async getJson(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
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
      return await response.json();
    } catch {
      throw new AdminApiError(
        'server',
        'A Admin API retornou uma resposta inválida.',
        response.status,
        'INVALID_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  private async postJson(path: string, body: Readonly<Record<string, unknown>>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(body),
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
      return await response.json();
    } catch {
      throw new AdminApiError(
        'server',
        'A Admin API retornou uma resposta inválida.',
        response.status,
        'INVALID_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }

  public async getSession(): Promise<AdminSession> {
    try {
      return assertSession(await this.getJson('/admin/v1/session'));
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta de sessão administrativa é inválida.',
        200,
        'INVALID_SESSION_RESPONSE',
        null,
      );
    }
  }

  public async searchPlayers(
    query: PlayerSearchQuery,
    cursor?: string,
  ): Promise<PlayerSearchResult> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/players`);
    appendQuery(url, { ...query, cursor });
    const path = `${url.pathname}${url.search}`;
    try {
      return assertPlayerSearchResult(await this.getJson(path));
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta da busca de jogadores é inválida.',
        200,
        'INVALID_PLAYER_SEARCH_RESPONSE',
        null,
      );
    }
  }

  public async getPlayer(playerId: string, includeSensitive: boolean): Promise<Player360Overview> {
    const url = new URL(`${this.apiBaseUrl}/admin/v1/players/${encodeURIComponent(playerId)}`);
    appendQuery(url, { includeSensitive });
    const path = `${url.pathname}${url.search}`;
    try {
      return assertPlayer360(await this.getJson(path));
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta do Player 360 é inválida.',
        200,
        'INVALID_PLAYER360_RESPONSE',
        null,
      );
    }
  }

  public async prepareOperation(
    request: AdminPrepareOperationRequest,
  ): Promise<AdminPrepareOperationResult> {
    const body: Record<string, unknown> = {
      operationType: request.operationType,
      input: request.input,
      idempotencyKey: request.idempotencyKey,
    };
    if (request.reason !== undefined) body.reason = request.reason;
    if (request.expectedRevision !== undefined) body.expectedRevision = request.expectedRevision;

    try {
      return assertPreparedOperation(await this.postJson('/admin/v1/operations/prepare', body));
    } catch (error) {
      if (error instanceof AdminApiError) throw error;
      throw new AdminApiError(
        'server',
        'A resposta da preparação administrativa é inválida.',
        200,
        'INVALID_PREPARED_OPERATION_RESPONSE',
        null,
      );
    }
  }
}
