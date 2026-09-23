import { useEffect, useState } from 'react';
import { usePlayerPortalBrowserSession } from './playerPortalBrowserSession';
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

let cachedAuthorizedState: PlayerPortalAdminState | null = null;
let pending: Promise<PlayerPortalAdminState> | null = null;

async function loadAdminState(): Promise<PlayerPortalAdminState> {
  if (
    cachedAuthorizedState?.status === 'admin' ||
    cachedAuthorizedState?.status === 'not-admin'
  ) {
    return cachedAuthorizedState;
  }
  if (pending) return pending;

  pending = getPlayerPortalAdmin()
    .then((result): PlayerPortalAdminState => {
      if (result.status === 'admin') return { status: 'admin', admin: result.admin };
      return { status: result.status, admin: null };
    })
    .catch((): PlayerPortalAdminState => ({ status: 'unavailable', admin: null }))
    .then((state) => {
      if (state.status === 'admin' || state.status === 'not-admin') {
        cachedAuthorizedState = state;
      }
      pending = null;
      return state;
    });

  return pending;
}

export function usePlayerPortalAdmin(): PlayerPortalAdminState {
  const session = usePlayerPortalBrowserSession();
  const [state, setState] = useState<PlayerPortalAdminState>(
    cachedAuthorizedState ?? { status: 'loading', admin: null },
  );

  useEffect(() => {
    let active = true;

    if (session.status === 'loading') {
      setState({ status: 'loading', admin: null });
      return () => {
        active = false;
      };
    }

    if (session.status !== 'authenticated') {
      setState({ status: 'unauthenticated', admin: null });
      return () => {
        active = false;
      };
    }

    void loadAdminState().then((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
    };
  }, [session.status]);

  return state;
}
