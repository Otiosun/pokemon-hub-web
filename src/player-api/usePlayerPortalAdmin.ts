import { useEffect, useState } from 'react';
import {
  getPlayerPortalAdmin,
  type PlayerPortalAdminAccess,
} from './playerPortalAdminClient';

export type PlayerPortalAdminState =
  | { status: 'loading'; admin: null }
  | { status: 'unauthenticated'; admin: null }
  | { status: 'not-admin'; admin: null }
  | { status: 'unavailable'; admin: null }
  | { status: 'admin'; admin: PlayerPortalAdminAccess };

let cachedState: PlayerPortalAdminState | null = null;
let pending: Promise<PlayerPortalAdminState> | null = null;

async function loadAdminState(): Promise<PlayerPortalAdminState> {
  if (cachedState && cachedState.status !== 'unavailable') return cachedState;
  if (pending) return pending;

  pending = getPlayerPortalAdmin()
    .then((result): PlayerPortalAdminState => {
      if (result.status === 'admin') return { status: 'admin', admin: result.admin };
      return { status: result.status, admin: null };
    })
    .catch((): PlayerPortalAdminState => ({ status: 'unavailable', admin: null }))
    .then((state) => {
      cachedState = state;
      pending = null;
      return state;
    });

  return pending;
}

export function usePlayerPortalAdmin(): PlayerPortalAdminState {
  const [state, setState] = useState<PlayerPortalAdminState>(
    cachedState ?? { status: 'loading', admin: null },
  );

  useEffect(() => {
    let active = true;
    void loadAdminState().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
