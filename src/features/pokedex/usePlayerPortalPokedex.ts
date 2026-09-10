import { useEffect, useState } from 'react';
import {
  getPlayerPortalPokedex,
  type PlayerPortalPokedexResult,
  type PlayerPortalPokedexSpecies,
} from '../../player-api/playerPortalClient';
import { usePlayerPortalBrowserSession } from '../../player-api/playerPortalBrowserSession';

export type PokedexDiscoveryState = 'unknown' | 'seen' | 'caught';

export type AuthoritativePokedexSpeciesState = {
  discovery: PokedexDiscoveryState;
  seenCount: string;
  caughtCount: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  firstCaughtAt: string | null;
  lastCaughtAt: string | null;
};

export type PlayerPortalPokedexState =
  | { status: 'loading' }
  | { status: 'authenticated'; pokedex: readonly PlayerPortalPokedexSpecies[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

const UNKNOWN_STATE: AuthoritativePokedexSpeciesState = {
  discovery: 'unknown',
  seenCount: '0',
  caughtCount: '0',
  firstSeenAt: null,
  lastSeenAt: null,
  firstCaughtAt: null,
  lastCaughtAt: null,
};

let cache: { playerId: string; pokedex: readonly PlayerPortalPokedexSpecies[] } | null = null;
let pending: { playerId: string; promise: Promise<PlayerPortalPokedexResult> } | null = null;

function isPositiveCount(value: string) {
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

export function getAuthoritativePokedexSpeciesState(
  entry: PlayerPortalPokedexSpecies | undefined,
): AuthoritativePokedexSpeciesState {
  if (!entry) return UNKNOWN_STATE;

  const discovery: PokedexDiscoveryState = isPositiveCount(entry.caughtCount)
    ? 'caught'
    : isPositiveCount(entry.seenCount)
      ? 'seen'
      : 'unknown';

  return {
    discovery,
    seenCount: entry.seenCount,
    caughtCount: entry.caughtCount,
    firstSeenAt: entry.firstSeenAt,
    lastSeenAt: entry.lastSeenAt,
    firstCaughtAt: entry.firstCaughtAt,
    lastCaughtAt: entry.lastCaughtAt,
  };
}

function loadPokedex(playerId: string): Promise<PlayerPortalPokedexResult> {
  if (cache?.playerId === playerId) {
    return Promise.resolve({ status: 'authenticated', pokedex: [...cache.pokedex] });
  }
  if (pending?.playerId === playerId) return pending.promise;

  const promise = getPlayerPortalPokedex().finally(() => {
    if (pending?.promise === promise) pending = null;
  });
  pending = { playerId, promise };
  return promise;
}

export function usePlayerPortalPokedex(): PlayerPortalPokedexState {
  const session = usePlayerPortalBrowserSession();
  const playerId = session.status === 'authenticated' ? session.profile.playerId : null;
  const [state, setState] = useState<PlayerPortalPokedexState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    if (session.status === 'loading') {
      setState({ status: 'loading' });
      return () => {
        cancelled = true;
      };
    }

    if (session.status !== 'authenticated' || playerId === null) {
      setState({ status: session.status === 'unavailable' ? 'unavailable' : 'unauthenticated' });
      return () => {
        cancelled = true;
      };
    }

    if (cache?.playerId === playerId) {
      setState({ status: 'authenticated', pokedex: cache.pokedex });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });
    loadPokedex(playerId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'unauthenticated') {
          setState(result);
          return;
        }
        cache = { playerId, pokedex: result.pokedex };
        setState({ status: 'authenticated', pokedex: result.pokedex });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, session.status]);

  return state;
}
