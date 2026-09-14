import { useEffect, useState } from 'react';
import { getAdvancedShowcaseSession, isAdvancedShowcaseActive } from '../showcase/advancedShowcase';
import {
  bootstrapPlayerPortalSession,
  type PlayerPortalSessionBootstrap,
} from './playerPortalSession';

export type PlayerPortalBrowserSessionState =
  | { status: 'loading' }
  | PlayerPortalSessionBootstrap
  | { status: 'unavailable' };

let sharedBootstrap: Promise<PlayerPortalSessionBootstrap> | null = null;

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

  return state;
}
