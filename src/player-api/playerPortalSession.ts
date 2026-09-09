import {
  exchangePlayerPortalTicket,
  getPlayerPortalSelf,
  type PlayerPortalFetcher,
  type PlayerPortalProfile,
} from './playerPortalClient';

export type PlayerPortalSessionBootstrap =
  | {
      status: 'authenticated';
      source: 'session';
      profile: PlayerPortalProfile;
    }
  | {
      status: 'authenticated';
      source: 'ticket';
      profile: PlayerPortalProfile;
      sessionExpiresAt: string;
    }
  | { status: 'unauthenticated' }
  | { status: 'invalid_ticket' }
  | { status: 'ineligible' };

export async function bootstrapPlayerPortalSession(
  ticket: string | null,
  fetcher: PlayerPortalFetcher = fetch,
): Promise<PlayerPortalSessionBootstrap> {
  if (ticket !== null) {
    const exchanged = await exchangePlayerPortalTicket(ticket, fetcher);
    if (exchanged.status !== 'authenticated') return exchanged;

    return {
      status: 'authenticated',
      source: 'ticket',
      profile: exchanged.profile,
      sessionExpiresAt: exchanged.sessionExpiresAt,
    };
  }

  const current = await getPlayerPortalSelf(fetcher);
  if (current.status === 'unauthenticated') return current;

  return {
    status: 'authenticated',
    source: 'session',
    profile: current.profile,
  };
}
