import { describe, expect, it, vi } from 'vitest';
import * as playerPortalClient from './playerPortalClient';

const encounter = {
  encounterId: '11111111-1111-4111-8111-111111111111',
  areaId: '22222222-2222-4222-8222-222222222222',
  status: 'PRESENTED',
  revision: '1',
  createdAt: '2026-09-10T03:00:00.000Z',
  updatedAt: '2026-09-10T03:00:00.000Z',
  expiresAt: '2026-09-10T03:05:00.000Z',
  closedAt: null,
  wild: {
    formId: '33333333-3333-4333-8333-333333333333',
    displayName: 'Pidgey',
    nationalDex: 16,
    typeNames: ['Normal', 'Flying'],
    level: 3,
    currentHp: 12,
    maxHp: 12,
    shiny: false,
    gender: 'FEMALE',
  },
} as const;

describe('Hub encounter client', () => {
  it('creates an authoritative encounter without browser-owned player or area ids', async () => {
    const createEncounter = Reflect.get(playerPortalClient, 'createPlayerPortalEncounter') as
      | ((input: Record<string, string>, fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof createEncounter).toBe('function');
    if (typeof createEncounter !== 'function') return;

    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ encounter }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const input = {
      idempotencyKey: 'hub-encounter-00000001',
      encounterTableSlug: 'grass',
    };

    await expect(createEncounter(input, fetcher)).resolves.toEqual({
      status: 'authenticated',
      encounter,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/hub/encounters', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    expect(JSON.stringify(input)).not.toContain('playerId');
    expect(JSON.stringify(input)).not.toContain('areaId');
  });

  it('reads an encounter by its opaque encounter id', async () => {
    const getEncounter = Reflect.get(playerPortalClient, 'getPlayerPortalEncounter') as
      | ((encounterId: string, fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof getEncounter).toBe('function');
    if (typeof getEncounter !== 'function') return;

    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ encounter }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );

    await expect(getEncounter(encounter.encounterId, fetcher)).resolves.toEqual({
      status: 'authenticated',
      encounter,
    });
    expect(fetcher).toHaveBeenCalledWith(`/api/hub/encounters/${encounter.encounterId}`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it.each(['observe', 'flee'] as const)(
    '%s mutates only by route id plus expected revision',
    async (action) => {
      const exportName =
        action === 'observe' ? 'observePlayerPortalEncounter' : 'fleePlayerPortalEncounter';
      const mutate = Reflect.get(playerPortalClient, exportName) as
        | ((encounterId: string, input: { expectedRevision: string }, fetcher: typeof fetch) => Promise<unknown>)
        | undefined;
      expect(typeof mutate).toBe('function');
      if (typeof mutate !== 'function') return;

      const nextEncounter = {
        ...encounter,
        status: action === 'flee' ? 'FLED' : 'OBSERVED',
        revision: '2',
        updatedAt: '2026-09-10T03:00:10.000Z',
        closedAt: action === 'flee' ? '2026-09-10T03:00:10.000Z' : null,
      };
      const fetcher = vi.fn(
        async () =>
          new Response(JSON.stringify({ encounter: nextEncounter }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      );

      await expect(
        mutate(encounter.encounterId, { expectedRevision: '1' }, fetcher),
      ).resolves.toEqual({ status: 'authenticated', encounter: nextEncounter });
      expect(fetcher).toHaveBeenCalledWith(
        `/api/hub/encounters/${encounter.encounterId}/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ expectedRevision: '1' }),
        },
      );
    },
  );

  it('returns unauthenticated on 401 and rejects malformed encounter payloads', async () => {
    const getEncounter = Reflect.get(playerPortalClient, 'getPlayerPortalEncounter') as
      | ((encounterId: string, fetcher: typeof fetch) => Promise<unknown>)
      | undefined;
    expect(typeof getEncounter).toBe('function');
    if (typeof getEncounter !== 'function') return;

    const unauthorized = vi.fn(async () => new Response(null, { status: 401 }));
    await expect(getEncounter(encounter.encounterId, unauthorized)).resolves.toEqual({
      status: 'unauthenticated',
    });

    const malformed = vi.fn(
      async () => new Response(JSON.stringify({ encounter: { encounterId: encounter.encounterId } })),
    );
    await expect(getEncounter(encounter.encounterId, malformed)).rejects.toThrow(
      'Invalid player portal response',
    );
  });
});

describe('Hub encounter BFF contract', () => {
  const encounterRoutes = import.meta.glob('../../api/hub/encounters/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;

  it('has thin proxies for create, get, observe and flee', () => {
    const create = encounterRoutes['../../api/hub/encounters/index.ts'];
    const detail = encounterRoutes['../../api/hub/encounters/[encounterId].ts'];
    const observe = encounterRoutes['../../api/hub/encounters/[encounterId]/observe.ts'];
    const flee = encounterRoutes['../../api/hub/encounters/[encounterId]/flee.ts'];

    expect(create).toBeTypeOf('string');
    expect(create).toContain("upstreamPath: '/v1/hub/encounters'");
    expect(create).toContain("allowedMethod: 'POST'");
    expect(detail).toBeTypeOf('string');
    expect(observe).toBeTypeOf('string');
    expect(flee).toBeTypeOf('string');
    expect(detail).toContain("allowedMethod: 'GET'");
    expect(observe).toContain("allowedMethod: 'POST'");
    expect(flee).toContain("allowedMethod: 'POST'");
  });
});
