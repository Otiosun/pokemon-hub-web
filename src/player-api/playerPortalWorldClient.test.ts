import { describe, expect, it, vi } from 'vitest';
import * as playerPortalClient from './playerPortalClient';

type WorldConnection = {
  connectionId: string;
  connectionKey: string;
  destinationAreaId: string;
  destinationSlug: string;
  destinationDisplayName: string;
  available: boolean;
  missingUnlockKeys: string[];
};

type WorldLocation = {
  areaId: string;
  areaSlug: string;
  areaDisplayName: string;
  regionId: string;
  regionSlug: string;
  regionDisplayName: string;
  safePoint: boolean;
  revision: string;
  enteredAt: string;
  requiresRelocation: boolean;
  relocationAreaId: string | null;
  connections: WorldConnection[];
};

const location: WorldLocation = {
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

describe('Hub world client', () => {
  it('reads the authoritative current location through the same-origin BFF', async () => {
    const getLocation = Reflect.get(playerPortalClient, 'getPlayerPortalWorldLocation') as
      | ((fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof getLocation).toBe('function');
    if (typeof getLocation !== 'function') return;

    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ location }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getLocation(fetcher)).resolves.toEqual({ status: 'authenticated', location });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/world/location', {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('travels using only destination, revision and idempotency through the BFF', async () => {
    const travel = Reflect.get(playerPortalClient, 'travelPlayerPortalWorld') as
      | ((input: Record<string, string>, fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof travel).toBe('function');
    if (typeof travel !== 'function') return;

    const nextLocation = {
      ...location,
      areaId: '44444444-4444-4444-8444-444444444444',
      areaSlug: 'pallet-town',
      areaDisplayName: 'Pallet Town',
      safePoint: true,
      revision: '4',
      enteredAt: '2026-09-09T18:01:00.000Z',
      connections: [],
    };
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ travel: { from: location, to: nextLocation, replayed: false } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    const input = {
      destinationAreaId: '44444444-4444-4444-8444-444444444444',
      expectedRevision: '3',
      idempotencyKey: 'hub-travel-00000001',
    };

    await expect(travel(input, fetcher)).resolves.toEqual({
      status: 'authenticated',
      travel: { from: location, to: nextLocation, replayed: false },
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/world/travel', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    expect(JSON.stringify(input)).not.toContain('playerId');
  });

  it('rejects malformed world payloads rather than creating local world state', async () => {
    const getLocation = Reflect.get(playerPortalClient, 'getPlayerPortalWorldLocation') as
      | ((fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof getLocation).toBe('function');
    if (typeof getLocation !== 'function') return;

    const fetcher = vi.fn(async () => new Response('{"location":{"areaSlug":"route-1"}}'));
    await expect(getLocation(fetcher)).rejects.toThrow('Invalid player portal response');
  });
});

describe('Hub world BFF contract', () => {
  const worldRoutes = import.meta.glob('../../api/hub/world/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('has a thin GET proxy for authoritative location', () => {
    const source = worldRoutes['../../api/hub/world/location.ts'];
    expect(source).toBeTypeOf('string');
    expect(source).toContain("upstreamPath: '/v1/hub/world/location'");
    expect(source).toContain("allowedMethod: 'GET'");
  });

  it('has a thin POST proxy for authoritative travel', () => {
    const source = worldRoutes['../../api/hub/world/travel.ts'];
    expect(source).toBeTypeOf('string');
    expect(source).toContain("upstreamPath: '/v1/hub/world/travel'");
    expect(source).toContain("allowedMethod: 'POST'");
  });
});
