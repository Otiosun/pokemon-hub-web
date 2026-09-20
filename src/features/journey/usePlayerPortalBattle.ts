import { useEffect, useState } from 'react';
import {
  getPlayerPortalBattle,
  type PlayerPortalBattle,
} from '../../player-api/playerPortalClient';

export type PlayerPortalBattleState =
  | { status: 'loading' }
  | { status: 'authenticated'; battle: PlayerPortalBattle | null }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export function usePlayerPortalBattle(): PlayerPortalBattleState {
  const [state, setState] = useState<PlayerPortalBattleState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const load = async () => {
      try {
        const result = await getPlayerPortalBattle();
        if (!cancelled) setState(result);
      } catch {
        if (!cancelled) setState({ status: 'unavailable' });
      }
    };

    void load();
    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 10_000);

    const onFocus = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return state;
}
