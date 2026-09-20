import { useCallback, useEffect, useState } from 'react';
import {
  getPlayerPortalPokemon,
  type PlayerPortalPokemon,
  type PlayerPortalPokemonResult,
} from '../../player-api/playerPortalClient';
import { usePlayerPortalBrowserSession } from '../../player-api/playerPortalBrowserSession';
import {
  isAdvancedShowcaseActive,
  readAdvancedShowcasePokemon,
  writeAdvancedShowcasePokemon,
} from '../../showcase/advancedShowcase';

type OwnedPokemonCollectionSnapshot =
  | { status: 'loading' }
  | { status: 'authenticated'; pokemon: readonly PlayerPortalPokemon[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export type OwnedPokemonCollectionState = OwnedPokemonCollectionSnapshot & {
  readonly replacePokemon: (pokemon: readonly PlayerPortalPokemon[]) => void;
  readonly refresh: () => Promise<void>;
};

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
  const [state, setState] = useState<OwnedPokemonCollectionSnapshot>(() =>
    showcase
      ? { status: 'authenticated', pokemon: readAdvancedShowcasePokemon() }
      : { status: 'loading' },
  );

  useEffect(() => {
    let cancelled = false;

    if (showcase) {
      setState({ status: 'authenticated', pokemon: readAdvancedShowcasePokemon() });
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

  const replacePokemon = useCallback(
    (pokemon: readonly PlayerPortalPokemon[]) => {
      if (showcase) {
        const snapshot = writeAdvancedShowcasePokemon(pokemon);
        setState({ status: 'authenticated', pokemon: snapshot });
        return;
      }
      if (playerId === null) return;
      cache = { playerId, pokemon: [...pokemon] };
      setState({ status: 'authenticated', pokemon: [...pokemon] });
    },
    [playerId, showcase],
  );

  const refresh = useCallback(async () => {
    if (showcase) {
      setState({ status: 'authenticated', pokemon: readAdvancedShowcasePokemon() });
      return;
    }
    if (playerId === null) return;
    if (cache?.playerId === playerId) cache = null;
    setState({ status: 'loading' });
    try {
      const result = await getPlayerPortalPokemon();
      if (result.status === 'unauthenticated') {
        setState(result);
        return;
      }
      cache = { playerId, pokemon: result.pokemon };
      setState({ status: 'authenticated', pokemon: result.pokemon });
    } catch {
      setState({ status: 'unavailable' });
    }
  }, [playerId, showcase]);

  useEffect(() => {
    if (showcase || playerId === null) return;

    let cancelled = false;
    const sync = () => {
      if (document.visibilityState !== 'visible') return;
      if (cache?.playerId === playerId) cache = null;
      void loadPokemon(playerId)
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
          // Preserve the visible snapshot on transient background-sync failures.
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [playerId, showcase]);

  return { ...state, replacePokemon, refresh };
}
