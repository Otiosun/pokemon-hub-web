import { useEffect, useState } from 'react';
import { getAdvancedShowcaseSession, isAdvancedShowcaseActive } from '../showcase/advancedShowcase';
import {
  bootstrapPlayerPortalSession,
  type PlayerPortalSessionBootstrap,
} from './playerPortalSession';
import type { PlayerPortalProfile } from './playerPortalClient';

export type PlayerPortalBrowserSessionState =
  | { status: 'loading' }
  | PlayerPortalSessionBootstrap
  | { status: 'unavailable' };

let sharedBootstrap: Promise<PlayerPortalSessionBootstrap> | null = null;
let sharedRefresh: Promise<PlayerPortalSessionBootstrap> | null = null;

const PLAYER_PORTAL_PROFILE_UPDATED_EVENT = 'pokemon-beyond:player-profile-updated';

export function publishPlayerPortalProfileUpdate(profile: PlayerPortalProfile) {
  window.dispatchEvent(
    new CustomEvent<PlayerPortalProfile>(PLAYER_PORTAL_PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}

export function extractPlayerPortalTicketFromUrl(url: URL): {
  ticket: string | null;
  cleanPath: string | null;
} {
  const rawHash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const fragment = new URLSearchParams(rawHash);
  if (!fragment.has('hub_ticket')) return { ticket: null, cleanPath: null };

  const ticket = fragment.get('hub_ticket') ?? '';
  fragment.delete('hub_ticket');
  const remainingHash = fragment.toString();

  return {
    ticket,
    cleanPath: `${url.pathname}${url.search}${remainingHash ? `#${remainingHash}` : ''}`,
  };
}

function refreshBrowserSession(): Promise<PlayerPortalSessionBootstrap> {
  if (sharedRefresh) return sharedRefresh;
  const pending = bootstrapPlayerPortalSession(null).finally(() => {
    if (sharedRefresh === pending) sharedRefresh = null;
  });
  sharedRefresh = pending;
  return pending;
}

function bootstrapBrowserSession(): Promise<PlayerPortalSessionBootstrap> {
  if (sharedBootstrap) return sharedBootstrap;

  const extracted = extractPlayerPortalTicketFromUrl(new URL(window.location.href));
  if (extracted.cleanPath !== null) {
    window.history.replaceState(window.history.state, '', extracted.cleanPath);
  }

  sharedBootstrap = bootstrapPlayerPortalSession(extracted.ticket);
  return sharedBootstrap;
}

export function usePlayerPortalBrowserSession(): PlayerPortalBrowserSessionState {
  const showcase = isAdvancedShowcaseActive();
  const [state, setState] = useState<PlayerPortalBrowserSessionState>(() =>
    showcase ? getAdvancedShowcaseSession() : { status: 'loading' },
  );

  useEffect(() => {
    let cancelled = false;

    if (showcase) {
      setState(getAdvancedShowcaseSession());
      return () => {
        cancelled = true;
      };
    }

    bootstrapBrowserSession()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, [showcase]);

  useEffect(() => {
    const onProfileUpdate = (event: Event) => {
      const profile = (event as CustomEvent<PlayerPortalProfile>).detail;
      setState((current) =>
        current.status === 'authenticated'
          ? { ...current, profile }
          : current,
      );
    };

    window.addEventListener(PLAYER_PORTAL_PROFILE_UPDATED_EVENT, onProfileUpdate);
    return () =>
      window.removeEventListener(PLAYER_PORTAL_PROFILE_UPDATED_EVENT, onProfileUpdate);
  }, []);

  useEffect(() => {
    if (showcase) return;

    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshBrowserSession()
        .then((next) => {
          if (!cancelled) setState(next);
        })
        .catch(() => {
          // Keep the last known session snapshot on transient focus-refresh failures.
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showcase]);

  return state;
}
