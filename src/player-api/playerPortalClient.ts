const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGITS_PATTERN = /^\d+$/;

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
  level: number;
  currentHp: number;
  slotNo: number;
};

export type PlayerPortalProfile = {
  playerId: string;
  playerStatus: 'ACTIVE';
  trainerName: string | null;
  originRegionId: string | null;
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

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Invalid player portal response');
  }

  if (!isRecord(body) || !isPlayerPortalProfile(body.profile)) {
    throw new Error('Invalid player portal response');
  }

  return { status: 'authenticated', profile: body.profile };
}

function isPlayerPortalProfile(value: unknown): value is PlayerPortalProfile {
  if (!isRecord(value)) return false;
  if (!isUuid(value.playerId) || value.playerStatus !== 'ACTIVE') return false;
  if (!isNullableString(value.trainerName)) return false;
  if (!isNullableUuid(value.originRegionId) || !isNullableString(value.locale)) return false;
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
  return (
    isUuid(value.pokemonInstanceId) &&
    isUuid(value.formId) &&
    typeof value.level === 'number' &&
    Number.isInteger(value.level) &&
    value.level >= 1 &&
    isNonNegativeInteger(value.currentHp) &&
    typeof value.slotNo === 'number' &&
    Number.isInteger(value.slotNo) &&
    value.slotNo >= 1 &&
    value.slotNo <= 6
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

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
