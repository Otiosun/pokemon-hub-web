import { useEffect, useState } from 'react';
import {
  getPlayerPortalAdminAccess,
  type PlayerPortalAdminAccess,
} from './playerPortalAdminClient';

export type PlayerPortalAdminBrowserState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'authorized'; admin: PlayerPortalAdminAccess }
  | { status: 'not_admin' }
  | { status: 'unavailable' };

export function usePlayerPortalAdminAccess(enabled: boolean): PlayerPortalAdminBrowserState {
  const [state, setState] = useState<PlayerPortalAdminBrowserState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setState({ status: 'idle' });
      return () => {
        cancelled = true;
      };
    }

    setState({ status: 'loading' });
    getPlayerPortalAdminAccess()
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'authorized') {
          setState(result);
        } else {
          setState({ status: 'not_admin' });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
