const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITS_PATTERN = /^\d+$/;
const HUB_LOGIN_TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const ONBOARDING_STATES = new Set([
  'NEW',
  'PROFILE_CREATED',
  'REGION_SELECTED',
  'STARTER_PENDING',
  'STARTER_GRANTED',
  'COMPLETE',
]);

export type PlayerPortalTeamSlot = {
  pokemonInstanceId: string;
  formId: string;
  displayName: string | null;
  nationalDex: number | null;
  typeNames: string[];
  level: number;
  currentHp: number;
  shiny: boolean;
  slotNo: number;
};

export type PlayerPortalPokemon = {
  pokemonInstanceId: string;
  formId: string;
  displayName: string | null;
  nationalDex: number | null;
  typeNames: string[];
  nickname: string | null;
  level: number;
  currentHp: number;
  gender: string | null;
  shiny: boolean;
  placementKind: 'TEAM' | 'BOX';
  boxNo: number | null;
  slotNo: number;
};

export type PlayerPortalPokedexSpecies = {
  nationalDex: number;
  seenCount: string;
  caughtCount: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  firstCaughtAt: string | null;
  lastCaughtAt: string | null;
};

export type PlayerPortalLocation = {
  areaId: string;
  areaSlug: string;
  areaDisplayName: string;
  regionId: string;
  regionSlug: string;
  regionDisplayName: string;
  safePoint: boolean;
  enteredAt: string;
};

export type PlayerPortalProfile = {
  playerId: string;
  playerStatus: 'ACTIVE';
  trainerName: string | null;
  originRegionId: string | null;
  originRegionName: string | null;
  locale: string | null;
  trainerLevel: number;
  progressionPoints: string;
  onboardingState:
    | 'NEW'
    | 'PROFILE_CREATED'
    | 'REGION_SELECTED'
    | 'STARTER_PENDING'
    | 'STARTER_GRANTED'
    | 'COMPLETE';
  contentReleaseId: string;
  rulesetId: string;
  starterPokemonInstanceId: string | null;
  team: PlayerPortalTeamSlot[];
};

export type PlayerPortalSelfResult =
  | { status: 'authenticated'; profile: PlayerPortalProfile }
  | { status: 'unauthenticated' };

export type PlayerPortalPokemonResult =
  | { status: 'authenticated'; pokemon: PlayerPortalPokemon[] }
  | { status: 'unauthenticated' };

export type PlayerPortalPokedexResult =
  | { status: 'authenticated'; pokedex: PlayerPortalPokedexSpecies[] }
  | { status: 'unauthenticated' };

export type PlayerPortalLocationResult =
  | { status: 'authenticated'; location: PlayerPortalLocation }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export type PlayerPortalExchangeResult =
  | {
      status: 'authenticated';
      profile: PlayerPortalProfile;
      sessionExpiresAt: string;
    }
  | { status: 'invalid_ticket' }
  | { status: 'ineligible' };

export type PlayerPortalFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function getPlayerPortalSelf(
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalSelfResult> {
  const response = await fetcher('/api/hub/player/self', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal request failed (${response.status})`);

  const body = await readJsonBody(response);
  if (!isRecord(body) || !isPlayerPortalProfile(body.profile)) {
    throw new Error('Invalid player portal response');
  }

  return { status: 'authenticated', profile: body.profile };
}

export async function getPlayerPortalPokemon(
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalPokemonResult> {
  const response = await fetcher('/api/hub/player/pokemon', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal request failed (${response.status})`);

  const body = await readJsonBody(response);
  if (
    !isRecord(body) ||
    !Array.isArray(body.pokemon) ||
    !body.pokemon.every(isPlayerPortalPokemon)
  ) {
    throw new Error('Invalid player portal response');
  }

  return { status: 'authenticated', pokemon: body.pokemon };
}

export async function getPlayerPortalPokedex(
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalPokedexResult> {
  const response = await fetcher('/api/hub/player/pokedex', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (!response.ok) throw new Error(`Player portal request failed (${response.status})`);

  const body = await readJsonBody(response);
  if (
    !isRecord(body) ||
    !Array.isArray(body.pokedex) ||
    !body.pokedex.every(isPlayerPortalPokedexSpecies) ||
    new Set(body.pokedex.map((entry) => entry.nationalDex)).size !== body.pokedex.length
  ) {
    throw new Error('Invalid player portal response');
  }

  return { status: 'authenticated', pokedex: body.pokedex };
}

export async function getPlayerPortalLocation(
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalLocationResult> {
  const response = await fetcher('/api/hub/player/location', {
    method: 'GET',
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 404) return { status: 'unavailable' };
  if (!response.ok) throw new Error(`Player portal request failed (${response.status})`);

  const body = await readJsonBody(response);
  if (!isRecord(body) || !isPlayerPortalLocation(body.location)) {
    throw new Error('Invalid player portal response');
  }

  return { status: 'authenticated', location: body.location };
}

export async function exchangePlayerPortalTicket(
  ticket: string,
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalExchangeResult> {
  if (!HUB_LOGIN_TICKET_PATTERN.test(ticket)) return { status: 'invalid_ticket' };

  const response = await fetcher('/api/hub/auth/exchange', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ticket }),
  });

  if (response.status === 400 || response.status === 401) return { status: 'invalid_ticket' };
  if (response.status === 403) return { status: 'ineligible' };
  if (!response.ok) throw new Error(`Player portal login failed (${response.status})`);

  const body = await readJsonBody(response);
  if (
    !isRecord(body) ||
    !isPlayerPortalProfile(body.profile) ||
    !isIsoTimestamp(body.sessionExpiresAt)
  ) {
    throw new Error('Invalid player portal response');
  }

  return {
    status: 'authenticated',
    profile: body.profile,
    sessionExpiresAt: body.sessionExpiresAt,
  };
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid player portal response');
  }
}

function isPlayerPortalProfile(value: unknown): value is PlayerPortalProfile {
  if (!isRecord(value)) return false;
  if (!isUuid(value.playerId) || value.playerStatus !== 'ACTIVE') return false;
  if (!isNullableString(value.trainerName)) return false;
  if (
    !isNullableUuid(value.originRegionId) ||
    !isNullableDisplayString(value.originRegionName) ||
    !isNullableString(value.locale)
  ) {
    return false;
  }
  if (!isNonNegativeInteger(value.trainerLevel)) return false;
  if (
    typeof value.progressionPoints !== 'string' ||
    !DIGITS_PATTERN.test(value.progressionPoints)
  ) {
    return false;
  }
  if (typeof value.onboardingState !== 'string' || !ONBOARDING_STATES.has(value.onboardingState)) {
    return false;
  }
  if (!isUuid(value.contentReleaseId) || !isUuid(value.rulesetId)) return false;
  if (!isNullableUuid(value.starterPokemonInstanceId)) return false;
  if (!Array.isArray(value.team) || value.team.length > 6) return false;

  const slots = new Set<number>();
  for (const member of value.team) {
    if (!isPlayerPortalTeamSlot(member) || slots.has(member.slotNo)) return false;
    slots.add(member.slotNo);
  }

  return true;
}

function isPlayerPortalTeamSlot(value: unknown): value is PlayerPortalTeamSlot {
  if (!isRecord(value)) return false;
  if (
    !isUuid(value.pokemonInstanceId) ||
    !isUuid(value.formId) ||
    !isCatalogPresentation(value) ||
    typeof value.level !== 'number' ||
    !Number.isInteger(value.level) ||
    value.level < 1 ||
    !isNonNegativeInteger(value.currentHp) ||
    typeof value.shiny !== 'boolean' ||
    typeof value.slotNo !== 'number' ||
    !Number.isInteger(value.slotNo) ||
    value.slotNo < 1 ||
    value.slotNo > 6
  ) {
    return false;
  }

  return true;
}

function isPlayerPortalPokemon(value: unknown): value is PlayerPortalPokemon {
  if (!isRecord(value)) return false;
  if (
    !isUuid(value.pokemonInstanceId) ||
    !isUuid(value.formId) ||
    !isCatalogPresentation(value) ||
    !isNullableString(value.nickname) ||
    typeof value.level !== 'number' ||
    !Number.isInteger(value.level) ||
    value.level < 1 ||
    !isNonNegativeInteger(value.currentHp) ||
    !isNullableString(value.gender) ||
    typeof value.shiny !== 'boolean' ||
    typeof value.slotNo !== 'number' ||
    !Number.isInteger(value.slotNo) ||
    value.slotNo < 1
  ) {
    return false;
  }

  if (value.placementKind === 'TEAM') {
    return value.boxNo === null && value.slotNo <= 6;
  }

  if (value.placementKind === 'BOX') {
    return isPositiveInteger(value.boxNo);
  }

  return false;
}

function isPlayerPortalPokedexSpecies(value: unknown): value is PlayerPortalPokedexSpecies {
  if (!isRecord(value)) return false;
  if (!isPositiveInteger(value.nationalDex)) return false;
  if (
    typeof value.seenCount !== 'string' ||
    !DIGITS_PATTERN.test(value.seenCount) ||
    typeof value.caughtCount !== 'string' ||
    !DIGITS_PATTERN.test(value.caughtCount)
  ) {
    return false;
  }
  if (BigInt(value.caughtCount) > BigInt(value.seenCount)) return false;

  return (
    isNullableIsoTimestamp(value.firstSeenAt) &&
    isNullableIsoTimestamp(value.lastSeenAt) &&
    isNullableIsoTimestamp(value.firstCaughtAt) &&
    isNullableIsoTimestamp(value.lastCaughtAt)
  );
}

function isPlayerPortalLocation(value: unknown): value is PlayerPortalLocation {
  if (!isRecord(value)) return false;
  return (
    isUuid(value.areaId) &&
    isDisplayString(value.areaSlug) &&
    isDisplayString(value.areaDisplayName) &&
    isUuid(value.regionId) &&
    isDisplayString(value.regionSlug) &&
    isDisplayString(value.regionDisplayName) &&
    typeof value.safePoint === 'boolean' &&
    isIsoTimestamp(value.enteredAt)
  );
}

function isCatalogPresentation(value: Record<string, unknown>): boolean {
  if (!Array.isArray(value.typeNames) || value.typeNames.length > 2) return false;
  if (!value.typeNames.every(isDisplayString)) return false;
  if (new Set(value.typeNames).size !== value.typeNames.length) return false;

  const unresolved =
    value.displayName === null && value.nationalDex === null && value.typeNames.length === 0;
  if (unresolved) return true;

  return (
    isDisplayString(value.displayName) &&
    typeof value.nationalDex === 'number' &&
    Number.isInteger(value.nationalDex) &&
    value.nationalDex >= 1 &&
    value.typeNames.length >= 1
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNullableUuid(value: unknown): value is string | null {
  return value === null || isUuid(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isDisplayString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableDisplayString(value: unknown): value is string | null {
  return value === null || isDisplayString(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.endsWith('Z') && Number.isFinite(Date.parse(value));
}

function isNullableIsoTimestamp(value: unknown): value is string | null {
  return value === null || isIsoTimestamp(value);
}
