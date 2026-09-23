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

const pendingByPlayerId = new Map<string, Promise<PlayerPortalAdminState>>();

function loadAdminState(playerId: string): Promise<PlayerPortalAdminState> {
  const existing = pendingByPlayerId.get(playerId);
  if (existing) return existing;

  const pending = getPlayerPortalAdmin()
    .then((result): PlayerPortalAdminState => {
      if (result.status === 'admin') return { status: 'admin', admin: result.admin };
      return { status: result.status, admin: null };
    })
    .catch((): PlayerPortalAdminState => ({ status: 'unavailable', admin: null }))
    .finally(() => {
      if (pendingByPlayerId.get(playerId) === pending) {
        pendingByPlayerId.delete(playerId);
      }
    });

  pendingByPlayerId.set(playerId, pending);
  return pending;
}

export function usePlayerPortalAdmin(): PlayerPortalAdminState {
  const session = usePlayerPortalBrowserSession();
  const [state, setState] = useState<PlayerPortalAdminState>({
    status: 'loading',
    admin: null,
  });

  const playerId = session.status === 'authenticated' ? session.profile.playerId : null;

  useEffect(() => {
    let active = true;

    if (session.status === 'loading') {
      setState({ status: 'loading', admin: null });
      return () => {
        active = false;
      };
    }

    if (session.status !== 'authenticated' || playerId === null) {
      setState({ status: 'unauthenticated', admin: null });
      return () => {
        active = false;
      };
    }

    setState({ status: 'loading', admin: null });
    void loadAdminState(playerId).then((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
    };
  }, [playerId, session.status]);

  return state;
}
