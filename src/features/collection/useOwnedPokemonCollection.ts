import { useEffect, useState } from 'react';
import {
  getPlayerPortalPokemon,
  type PlayerPortalPokemon,
  type PlayerPortalPokemonResult,
} from '../../player-api/playerPortalClient';
import { usePlayerPortalBrowserSession } from '../../player-api/playerPortalBrowserSession';
import { createAdvancedShowcasePokemon, isAdvancedShowcaseActive } from '../../showcase/advancedShowcase';

export type OwnedPokemonCollectionState =
  | { status: 'loading' }
  | { status: 'authenticated'; pokemon: readonly PlayerPortalPokemon[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

let cache: { playerId: string; pokemon: readonly PlayerPortalPokemon[] } | null = null;
let pending: { playerId: string; promise: Promise<PlayerPortalPokemonResult> } | null = null;

function loadPokemon(playerId: string): Promise<PlayerPortalPokemonResult> {
  if (cache?.playerId === playerId) {
    return Promise.resolve({ status: 'authenticated', pokemon: [...cache.pokemon] });
  }
  if (pending?.playerId === playerId) return pending.promise;

  const promise = getPlayerPortalPokemon().finally(() => {
    if (pending?.promise === promise) pending = null;
  });
  pending = { playerId, promise };
  return promise;
}

export function useOwnedPokemonCollection(): OwnedPokemonCollectionState {
  const showcase = isAdvancedShowcaseActive();
  const session = usePlayerPortalBrowserSession();
  const playerId = session.status === 'authenticated' ? session.profile.playerId : null;
  const [state, setState] = useState<OwnedPokemonCollectionState>(() =>
    showcase
      ? { status: 'authenticated', pokemon: createAdvancedShowcasePokemon() }
      : { status: 'loading' },
  );

  useEffect(() => {
    let cancelled = false;

    if (showcase) {
      setState({ status: 'authenticated', pokemon: createAdvancedShowcasePokemon() });
      return () => {
        cancelled = true;
      };
    }

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
      setState({ status: 'authenticated', pokemon: cache.pokemon });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });
    loadPokemon(playerId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'unauthenticated') {
          setState(result);
          return;
        }
        cache = { playerId, pokemon: result.pokemon };
        setState({ status: 'authenticated', pokemon: result.pokemon });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, session.status, showcase]);

  return state;
}
