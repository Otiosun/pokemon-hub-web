export type AdminPlayerStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type AdminPlayerIdentity = {
  provider: string;
  externalId: string | null;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  revokedAt: string | null;
};

export type AdminPlayerSearchItem = {
  playerId: string;
  status: AdminPlayerStatus;
  trainerName: string | null;
  originRegionId: string | null;
  trainerLevel: number;
  insigniaPoints: string;
  areaId: string | null;
  activeEncounterId: string | null;
  activeEncounterStatus: string | null;
  activeBattleId: string | null;
  activeBattleStatus: string | null;
  identities: AdminPlayerIdentity[];
  createdAt: string;
};

export type AdminPlayerPokemon = {
  id: string;
  formSlug: string;
  speciesSlug: string;
  nationalDex: number;
  nickname: string | null;
  level: number;
  xp: string;
  currentHp: number;
  gender: string | null;
  shiny: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  abilitySlug: string | null;
  natureSlug: string | null;
  revision: string;
  placement: {
    kind: 'TEAM' | 'BOX';
    boxNo: number | null;
    slotNo: number;
  } | null;
  ivs: {
    hp: number | null;
    attack: number | null;
    defense: number | null;
    spAttack: number | null;
    spDefense: number | null;
    speed: number | null;
  };
  moves: Array<{
    slotNo: number;
    moveId: string;
    slug: string;
    ppCurrent: number | null;
    learnedAt: string;
  }>;
  persistentConditions: Array<{
    key: string;
    sourceType: string;
    sourceId: string;
    appliedAt: string;
    expiresAt: string | null;
  }>;
};

export type AdminPlayer360 = {
  player: {
    id: string;
    status: AdminPlayerStatus;
    createdAt: string;
    updatedAt: string;
    revision: string;
  };
  profile: {
    trainerName: string | null;
    originRegionId: string | null;
    locale: string | null;
    revision: string | null;
  };
  identities: AdminPlayerIdentity[];
  onboarding: {
    state: string | null;
    completedAt: string | null;
    revision: string | null;
    contentReleaseId: string | null;
    rulesetId: string | null;
  };
  progression: {
    level: number;
    insigniaPoints: string;
    revision: string;
    unlocks: Array<{
      key: string;
      status: 'ACTIVE' | 'REVOKED';
      sourceType: string;
      sourceId: string;
      unlockedAt: string;
      revokedAt: string | null;
      revision: string;
    }>;
  };
  location: {
    areaId: string;
    enteredAt: string;
    revision: string;
  } | null;
  wallets: Array<{
    currencyId: string;
    slug: string;
    displayName: string;
    amount: string;
    revision: string;
    updatedAt: string;
  }>;
  inventory: Array<{
    itemId: string;
    slug: string;
    quantity: string;
    revision: string;
    updatedAt: string;
  }>;
  pokemon: AdminPlayerPokemon[];
  pokedex: {
    speciesSeen: number;
    speciesCaught: number;
    entries: Array<{
      speciesId: string;
      nationalDex: number;
      slug: string;
      seenCount: string;
      caughtCount: string;
    }>;
  };
  activeEncounter: {
    id: string;
    status: string;
    areaId: string;
    revision: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  activeBattle: {
    id: string;
    status: string;
    battleType: string;
    encounterId: string | null;
    turnNumber: number;
    version: string;
    createdAt: string;
    updatedAt: string;
    endedAt: string | null;
    participants: Array<{
      participantId: string;
      pokemonInstanceId: string | null;
      level: number;
      currentHp: number;
      maxHp: number;
      majorStatus: {
        key: 'BURN' | 'POISON' | 'BAD_POISON' | 'PARALYSIS' | 'SLEEP' | 'FREEZE';
        counter: number | null;
      } | null;
      moves: Array<{
        slotNo: number;
        ppCurrent: number | null;
        maxPp: number | null;
      }>;
    }>;
  } | null;
  effects: Array<{
    id: string;
    effectId: string;
    effectSlug: string;
    playerId: string | null;
    pokemonInstanceId: string | null;
  }>;
  recentActivity: Array<{
    kind: 'TRAINER_PROGRESS' | 'INVENTORY' | 'WALLET' | 'POKEMON_HISTORY';
    occurredAt: string;
    subjectId: string | null;
    sourceType: string;
    sourceId: string;
    reason: string | null;
    correlationId: string | null;
  }>;
  unsupportedSections: string[];
};

export type AdminPlayerSearchResult =
  | { status: 'ok'; players: AdminPlayerSearchItem[]; nextCursor: string | null }
  | { status: 'unauthenticated' | 'forbidden' };

export type AdminPlayerDetailResult =
  | { status: 'ok'; player: AdminPlayer360 }
  | { status: 'unauthenticated' | 'forbidden' | 'not-found' };

export type AdminPlayerAdjustmentInput =
  | {
      requestId: string;
      kind: 'INVENTORY';
      itemId: string;
      delta: string;
      reason: string;
    }
  | {
      requestId: string;
      kind: 'WALLET';
      currencyId: string;
      delta: string;
      reason: string;
    }
  | {
      requestId: string;
      kind: 'PROGRESSION';
      delta: string;
      reason: string;
    }
  | {
      requestId: string;
      kind: 'POKEMON_XP';
      pokemonInstanceId: string;
      delta: string;
      reason: string;
    };

export type AdminPlayerAdjustmentResult =
  | {
      status: 'ok';
      operationId: string;
      replayed: boolean;
      result: Record<string, unknown> | null;
    }
  | { status: 'unauthenticated' | 'forbidden' }
  | { status: 'rejected'; code: string };

type Fetcher = typeof fetch;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIdentity(value: unknown): value is AdminPlayerIdentity {
  return (
    isRecord(value) &&
    typeof value.provider === 'string' &&
    isStringOrNull(value.externalId) &&
    (value.status === 'ACTIVE' || value.status === 'REVOKED') &&
    typeof value.createdAt === 'string' &&
    isStringOrNull(value.revokedAt)
  );
}

function isSearchItem(value: unknown): value is AdminPlayerSearchItem {
  return (
    isRecord(value) &&
    typeof value.playerId === 'string' &&
    UUID_PATTERN.test(value.playerId) &&
    (value.status === 'ACTIVE' || value.status === 'SUSPENDED' || value.status === 'ARCHIVED') &&
    isStringOrNull(value.trainerName) &&
    isStringOrNull(value.originRegionId) &&
    typeof value.trainerLevel === 'number' &&
    Number.isInteger(value.trainerLevel) &&
    typeof value.insigniaPoints === 'string' &&
    isStringOrNull(value.areaId) &&
    isStringOrNull(value.activeEncounterId) &&
    isStringOrNull(value.activeEncounterStatus) &&
    isStringOrNull(value.activeBattleId) &&
    isStringOrNull(value.activeBattleStatus) &&
    Array.isArray(value.identities) &&
    value.identities.every(isIdentity) &&
    typeof value.createdAt === 'string'
  );
}

function isActiveEncounter(value: unknown): value is AdminPlayer360['activeEncounter'] {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    UUID_PATTERN.test(value.id) &&
    typeof value.status === 'string' &&
    typeof value.areaId === 'string' &&
    typeof value.revision === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(value.revision) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isActiveBattle(value: unknown): value is AdminPlayer360['activeBattle'] {
  if (value === null) return true;
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    UUID_PATTERN.test(value.id) &&
    typeof value.status === 'string' &&
    typeof value.battleType === 'string' &&
    isStringOrNull(value.encounterId) &&
    typeof value.turnNumber === 'number' &&
    Number.isInteger(value.turnNumber) &&
    typeof value.version === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(value.version) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    isStringOrNull(value.endedAt)
  );
}

function isPlayer360(value: unknown): value is AdminPlayer360 {
  if (!isRecord(value) || !isRecord(value.player) || !isRecord(value.profile)) return false;
  if (!isRecord(value.progression) || !isRecord(value.onboarding) || !isRecord(value.pokedex)) {
    return false;
  }

  return (
    typeof value.player.id === 'string' &&
    UUID_PATTERN.test(value.player.id) &&
    (value.player.status === 'ACTIVE' ||
      value.player.status === 'SUSPENDED' ||
      value.player.status === 'ARCHIVED') &&
    isStringOrNull(value.profile.trainerName) &&
    typeof value.progression.level === 'number' &&
    typeof value.progression.insigniaPoints === 'string' &&
    Array.isArray(value.identities) &&
    value.identities.every(isIdentity) &&
    Array.isArray(value.wallets) &&
    Array.isArray(value.inventory) &&
    Array.isArray(value.pokemon) &&
    typeof value.pokedex.speciesSeen === 'number' &&
    typeof value.pokedex.speciesCaught === 'number' &&
    Array.isArray(value.pokedex.entries) &&
    isActiveEncounter(value.activeEncounter) &&
    isActiveBattle(value.activeBattle) &&
    Array.isArray(value.effects) &&
    Array.isArray(value.recentActivity) &&
    Array.isArray(value.unsupportedSections)
  );
}

function statusFromResponse(response: Response) {
  if (response.status === 401) return 'unauthenticated' as const;
  if (response.status === 403) return 'forbidden' as const;
  return null;
}

export async function searchAdminPlayers(
  input: {
    query?: string;
    status?: AdminPlayerStatus | '';
    cursor?: string | null;
    limit?: number;
  } = {},
  fetcher: Fetcher = fetch,
): Promise<AdminPlayerSearchResult> {
  const search = new URLSearchParams();
  const query = input.query?.trim();
  if (query) search.set('q', query);
  if (input.status) search.set('status', input.status);
  if (input.cursor) search.set('cursor', input.cursor);
  search.set('limit', String(input.limit ?? 25));

  const response = await fetcher(`/api/hub/admin/players?${search.toString()}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  const denied = statusFromResponse(response);
  if (denied) return { status: denied };
  if (!response.ok) throw new Error(`Admin player search failed (${response.status})`);

  const body = await response.json() as unknown;
  if (
    !isRecord(body) ||
    !Array.isArray(body.players) ||
    !body.players.every(isSearchItem) ||
    !isStringOrNull(body.nextCursor)
  ) {
    throw new Error('Invalid admin player search response');
  }

  return { status: 'ok', players: body.players, nextCursor: body.nextCursor };
}

export async function getAdminPlayer(
  playerId: string,
  fetcher: Fetcher = fetch,
): Promise<AdminPlayerDetailResult> {
  if (!UUID_PATTERN.test(playerId)) throw new Error('Invalid admin player id');

  const response = await fetcher(`/api/hub/admin/players/${encodeURIComponent(playerId)}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  const denied = statusFromResponse(response);
  if (denied) return { status: denied };
  if (response.status === 404) return { status: 'not-found' };
  if (!response.ok) throw new Error(`Admin player detail failed (${response.status})`);

  const body = await response.json() as unknown;
  if (!isRecord(body) || !isPlayer360(body.player)) {
    throw new Error('Invalid admin player detail response');
  }

  return { status: 'ok', player: body.player };
}

export async function adjustAdminPlayer(
  playerId: string,
  input: AdminPlayerAdjustmentInput,
  fetcher: Fetcher = fetch,
): Promise<AdminPlayerAdjustmentResult> {
  if (!UUID_PATTERN.test(playerId)) throw new Error('Invalid admin player id');
  if (!UUID_PATTERN.test(input.requestId)) throw new Error('Invalid admin adjustment request id');

  const response = await fetcher(
    `/api/hub/admin/players/${encodeURIComponent(playerId)}/adjustments`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  );

  const denied = statusFromResponse(response);
  if (denied) return { status: denied };

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const code =
      isRecord(body) && typeof body.error === 'string' ? body.error : `HTTP_${response.status}`;
    return { status: 'rejected', code };
  }

  if (
    !isRecord(body) ||
    typeof body.operationId !== 'string' ||
    !UUID_PATTERN.test(body.operationId) ||
    body.status !== 'APPLIED' ||
    typeof body.replayed !== 'boolean' ||
    !(body.result === null || isRecord(body.result))
  ) {
    throw new Error('Invalid admin player adjustment response');
  }

  return {
    status: 'ok',
    operationId: body.operationId,
    replayed: body.replayed,
    result: body.result,
  };
}
