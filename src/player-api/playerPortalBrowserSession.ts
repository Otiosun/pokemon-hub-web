import { useEffect, useState } from 'react';
import {
  bootstrapPlayerPortalSession,
  type PlayerPortalSessionBootstrap,
} from './playerPortalSession';

export type PlayerPortalBrowserSessionState =
  | { status: 'loading' }
  | PlayerPortalSessionBootstrap
  | { status: 'unavailable' };

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

export function usePlayerPortalBrowserSession(): PlayerPortalBrowserSessionState {
  const [state, setState] = useState<PlayerPortalBrowserSessionState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const extracted = extractPlayerPortalTicketFromUrl(new URL(window.location.href));

    if (extracted.cleanPath !== null) {
      window.history.replaceState(window.history.state, '', extracted.cleanPath);
    }

    bootstrapPlayerPortalSession(extracted.ticket)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
