import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API = 'https://admin-api.example.com';
const PLAYER_ID = '00000000-0000-4000-8000-000000000444';

function jsonResponse(
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function canonicalPlayer360() {
  return {
    player: {
      id: PLAYER_ID,
      status: 'ACTIVE',
      createdAt: '2026-08-20T12:00:00.000Z',
      updatedAt: '2026-08-30T18:30:00.000Z',
      revision: '14',
    },
    profile: {
      trainerName: 'Lia',
      originRegionId: '00000000-0000-4000-8000-000000000150',
      locale: 'pt-BR',
      metadata: null,
      revision: '3',
    },
    identities: [],
    onboarding: {
      state: 'COMPLETED',
      completedAt: '2026-08-20T12:15:00.000Z',
      revision: '5',
      contentReleaseId: '00000000-0000-4000-8000-000000000501',
      rulesetId: '00000000-0000-4000-8000-000000000601',
    },
    progression: {
      level: 12,
      insigniaPoints: '420',
      revision: '9',
      unlocks: [
        {
          key: 'travel:kanto-route-2',
          status: 'ACTIVE',
          sourceType: 'TRAINER_LEVEL',
          sourceId: 'level:10',
          unlockedAt: '2026-08-25T09:00:00.000Z',
          revokedAt: null,
          revision: '2',
        },
      ],
    },
    location: null,
    wallets: [],
    inventory: [],
    pokemon: [],
    pokedex: { speciesSeen: 0, speciesCaught: 0, entries: [] },
    activeEncounter: null,
    activeBattle: null,
    effects: [],
    recentActivity: [],
    unsupportedSections: ['COOLDOWNS', 'PUNISHMENTS_FLAGS'],
  };
}

function canonicalEconomyAnalytics() {
  return {
    asOf: '2026-09-02T12:00:00.000Z',
    window: '30d',
    currencies: [
      {
        slug: 'poke-dollar',
        displayName: 'Poké Dollar',
        inflow: '1000',
        outflow: '400',
        netFlow: '600',
        totalBalance: '9000',
      },
    ],
    currenciesTruncated: false,
    inventory: {
      inflowUnits: '80',
      outflowUnits: '30',
      netFlowUnits: '50',
      totalUnitsHeld: '700',
    },
    anomalies: {
      walletProjectionMismatches: '2',
      inventoryProjectionMismatches: '1',
    },
  } as const;
}

describe('AdminApiClient', () => {
  it('loads session with credentials include and no browser-supplied authority headers', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        principalId: '11111111-1111-4111-8111-111111111111',
        roles: ['OWNER_SECURITY_ADMIN'],
        capabilities: [{ key: 'player.read_sensitive', riskTier: 0 }],
        scopes: [{ scopeType: 'GLOBAL', scopeId: null }],
        environment: 'staging',
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).resolves.toMatchObject({
      roles: ['OWNER_SECURITY_ADMIN'],
      environment: 'staging',
    });
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/admin/v1/session`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('principalId');
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('cf-access-jwt-assertion');
  });

  it('encodes only allowlisted Player 360 search query fields', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ items: [], nextCursor: null }));
    const client = new AdminApiClient(API, fetchImpl);

    await client.searchPlayers({
      status: 'ACTIVE',
      trainerNamePrefix: 'Ash Ketchum',
      includeSensitive: false,
      limit: 25,
    });

    const [url] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      `${API}/admin/v1/players?status=ACTIVE&trainerNamePrefix=Ash+Ketchum&includeSensitive=false&limit=25`,
    );
  });

  it('normalizes the canonical nested backend Player 360 response for the UI', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(canonicalPlayer360()));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getPlayer(PLAYER_ID, false)).resolves.toMatchObject({
      playerId: PLAYER_ID,
      status: 'ACTIVE',
      playerRevision: '14',
      profile: { trainerName: 'Lia', locale: 'pt-BR', revision: '3' },
      onboarding: { state: 'COMPLETED', revision: '5' },
      progression: {
        level: 12,
        insigniaPoints: '420',
        revision: '9',
        unlocks: [
          {
            key: 'travel:kanto-route-2',
            status: 'ACTIVE',
            sourceType: 'TRAINER_LEVEL',
            sourceId: 'level:10',
            revision: '2',
          },
        ],
      },
      location: { areaId: null, enteredAt: null, revision: null },
    });
  });

  it('rejects malformed progression unlocks instead of silently trusting backend data', async () => {
    const malformed = canonicalPlayer360();
    malformed.progression.unlocks = [
      {
        ...malformed.progression.unlocks[0],
        status: 'GOD_MODE',
      },
    ];
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(malformed));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getPlayer(PLAYER_ID, false)).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_PLAYER360_RESPONSE',
    });
  });

  it('loads F8.3 economy analytics through one fixed credentialed GET', async () => {
    const payload = canonicalEconomyAnalytics();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(payload));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getEconomyAnalytics()).resolves.toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(`${API}/admin/v1/analytics/economy`, {
      method: 'GET',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  });

  it('fails closed on extra or unsafe F8.3 economy analytics fields', async () => {
    const malformed = {
      ...canonicalEconomyAnalytics(),
      playerId: PLAYER_ID,
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(malformed));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getEconomyAnalytics()).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    });
  });

  it('rejects invalid integer-text or arbitrary-window F8.3 economy analytics payloads', async () => {
    const invalidNumeric = canonicalEconomyAnalytics();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          ...invalidNumeric,
          currencies: [{ ...invalidNumeric.currencies[0], inflow: '1.5' }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ...canonicalEconomyAnalytics(), window: '7d' }));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getEconomyAnalytics()).rejects.toMatchObject({
      code: 'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    });
    await expect(client.getEconomyAnalytics()).rejects.toMatchObject({
      code: 'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    });
  });

  it('surfaces safe server error and correlation id', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'ADMIN_AUTHORIZATION_DENIED',
            message: 'Administrative access denied',
            correlationId: 'corr-123',
          },
        },
        403,
      ),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toMatchObject({
      kind: 'forbidden',
      status: 403,
      code: 'ADMIN_AUTHORIZATION_DENIED',
      correlationId: 'corr-123',
    });
  });

  it('normalizes network failures without exposing browser internals', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('socket secret'));
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toEqual(
      new AdminApiError(
        'network',
        'Não foi possível alcançar a Admin API.',
        null,
        'NETWORK_ERROR',
        null,
      ),
    );
  });

  it('rejects malformed session success payloads instead of inventing authority', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        principalId: '11111111-1111-4111-8111-111111111111',
        roles: ['OWNER_SECURITY_ADMIN'],
        capabilities: 'everything',
        scopes: [],
        environment: 'production',
      }),
    );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getSession()).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_SESSION_RESPONSE',
    });
  });
});
