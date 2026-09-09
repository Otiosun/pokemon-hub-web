import { describe, expect, it, vi } from 'vitest';
import type { PlayerPortalWorldLocation } from '../../player-api/playerPortalClient';
import { loadJourneyWorld, travelJourneyWorld } from './journeyWorldController';

const location: PlayerPortalWorldLocation = {
  areaId: '11111111-1111-4111-8111-111111111111',
  areaSlug: 'route-1',
  areaDisplayName: 'Route 1',
  regionId: '22222222-2222-4222-8222-222222222222',
  regionSlug: 'kanto',
  regionDisplayName: 'Kanto',
  safePoint: false,
  revision: '3',
  enteredAt: '2026-09-09T18:00:00.000Z',
  requiresRelocation: false,
  relocationAreaId: null,
  connections: [
    {
      connectionId: '33333333-3333-4333-8333-333333333333',
      connectionKey: 'route-1:pallet-town',
      destinationAreaId: '44444444-4444-4444-8444-444444444444',
      destinationSlug: 'pallet-town',
      destinationDisplayName: 'Pallet Town',
      available: true,
      missingUnlockKeys: [],
    },
  ],
};

describe('Journey world controller', () => {
  it('loads only the authoritative location returned by the Hub world endpoint', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ location }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(loadJourneyWorld(fetcher)).resolves.toEqual({ status: 'ready', location });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('travels from the current revision and adopts the server-confirmed destination state', async () => {
    const serverLocation: PlayerPortalWorldLocation = {
      ...location,
      areaId: '44444444-4444-4444-8444-444444444444',
      areaSlug: 'pallet-town',
      areaDisplayName: 'Pallet Town — confirmado',
      safePoint: true,
      revision: '99',
      enteredAt: '2026-09-09T18:01:00.000Z',
      connections: [],
    };
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual({
          destinationAreaId: '44444444-4444-4444-8444-444444444444',
          expectedRevision: '3',
          idempotencyKey: 'journey-travel-test-1',
        });
        return new Response(
          JSON.stringify({ travel: { from: location, to: serverLocation, replayed: false } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      },
    );

    await expect(
      travelJourneyWorld(
        location,
        '44444444-4444-4444-8444-444444444444',
        'journey-travel-test-1',
        fetcher,
      ),
    ).resolves.toEqual({ status: 'ready', location: serverLocation, replayed: false });
  });

  it('keeps unauthenticated world state explicit instead of falling back to preview data', async () => {
    const fetcher = vi.fn(async () => new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }));

    await expect(loadJourneyWorld(fetcher)).resolves.toEqual({ status: 'unauthenticated' });
  });
});
