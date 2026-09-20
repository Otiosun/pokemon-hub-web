import { useEffect, useState } from 'react';
import {
  getPlayerPortalLocation,
  type PlayerPortalLocation,
  type PlayerPortalLocationResult,
} from '../../player-api/playerPortalClient';
import { usePlayerPortalBrowserSession } from '../../player-api/playerPortalBrowserSession';
import {
  createAdvancedShowcaseLocation,
  isAdvancedShowcaseActive,
} from '../../showcase/advancedShowcase';

export type PlayerPortalLocationState =
  | { status: 'loading' }
  | { status: 'authenticated'; location: PlayerPortalLocation }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

let cache: { playerId: string; location: PlayerPortalLocation } | null = null;
let pending: { playerId: string; promise: Promise<PlayerPortalLocationResult> } | null = null;

function loadLocation(playerId: string): Promise<PlayerPortalLocationResult> {
  if (cache?.playerId === playerId) {
    return Promise.resolve({ status: 'authenticated', location: cache.location });
  }
  if (pending?.playerId === playerId) return pending.promise;

  const promise = getPlayerPortalLocation().finally(() => {
    if (pending?.promise === promise) pending = null;
  });
  pending = { playerId, promise };
  return promise;
}

export function usePlayerPortalLocation(): PlayerPortalLocationState {
  const showcase = isAdvancedShowcaseActive();
  const session = usePlayerPortalBrowserSession();
  const playerId = session.status === 'authenticated' ? session.profile.playerId : null;
  const [state, setState] = useState<PlayerPortalLocationState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    if (showcase) {
      setState({ status: 'authenticated', location: createAdvancedShowcaseLocation() });
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
      setState({ status: 'authenticated', location: cache.location });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });
    loadLocation(playerId)
      .then((result) => {
        if (cancelled) return;
        if (result.status !== 'authenticated') {
          setState(result);
          return;
        }
        cache = { playerId, location: result.location };
        setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, session.status, showcase]);

  useEffect(() => {
    if (showcase || playerId === null) return;

    let cancelled = false;
    const sync = () => {
      if (document.visibilityState !== 'visible') return;
      cache = null;
      void loadLocation(playerId)
        .then((result) => {
          if (cancelled) return;
          if (result.status !== 'authenticated') {
            setState(result);
            return;
          }
          cache = { playerId, location: result.location };
          setState(result);
        })
        .catch(() => {
          // Keep the previous location during transient focus-refresh failures.
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

  return state;
}
