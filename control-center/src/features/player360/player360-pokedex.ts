import type { Player360Overview } from '../../lib/api/admin-api';

export interface Player360PokedexEntryView {
  readonly speciesId: string;
  readonly nationalDex: number;
  readonly slug: string;
  readonly seenCount: string;
  readonly caughtCount: string;
  readonly firstSeenAt: string | null;
  readonly lastSeenAt: string | null;
  readonly firstCaughtAt: string | null;
  readonly lastCaughtAt: string | null;
}

export interface Player360PokedexView {
  readonly speciesSeen: number;
  readonly speciesCaught: number;
  readonly entries: readonly Player360PokedexEntryView[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseEntry(value: unknown): Player360PokedexEntryView {
  if (
    !isRecord(value) ||
    typeof value.speciesId !== 'string' ||
    !UUID_PATTERN.test(value.speciesId) ||
    !Number.isInteger(value.nationalDex) ||
    Number(value.nationalDex) <= 0 ||
    !nonEmptyString(value.slug) ||
    typeof value.seenCount !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(value.seenCount) ||
    typeof value.caughtCount !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(value.caughtCount) ||
    !nullableString(value.firstSeenAt) ||
    !nullableString(value.lastSeenAt) ||
    !nullableString(value.firstCaughtAt) ||
    !nullableString(value.lastCaughtAt)
  ) {
    throw new Error('Invalid Player 360 Pokedex entry.');
  }

  return {
    speciesId: value.speciesId,
    nationalDex: value.nationalDex as number,
    slug: value.slug,
    seenCount: value.seenCount,
    caughtCount: value.caughtCount,
    firstSeenAt: value.firstSeenAt,
    lastSeenAt: value.lastSeenAt,
    firstCaughtAt: value.firstCaughtAt,
    lastCaughtAt: value.lastCaughtAt,
  };
}

export function parsePlayer360Pokedex(player: Player360Overview): Player360PokedexView {
  if (
    !Number.isInteger(player.pokedex.speciesSeen) ||
    player.pokedex.speciesSeen < 0 ||
    !Number.isInteger(player.pokedex.speciesCaught) ||
    player.pokedex.speciesCaught < 0
  ) {
    throw new Error('Invalid Player 360 Pokedex totals.');
  }

  return {
    speciesSeen: player.pokedex.speciesSeen,
    speciesCaught: player.pokedex.speciesCaught,
    entries: player.pokedex.entries.map(parseEntry),
  };
}
