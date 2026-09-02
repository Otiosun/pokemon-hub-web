import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient, AdminApiError } from './admin-api';

const API_BASE_URL = 'https://admin-api.example.test';
const aggregate = {
  asOf: '2026-09-02T12:30:00.000Z',
  activePlayers: { last24Hours: 12, last7Days: 34, last30Days: 56 },
  returningPlayers7Days: 7,
} as const;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-correlation-id': 'corr-player-activity' },
  });
}

describe('AdminApiClient player activity analytics', () => {
  it('reads the fixed global aggregate endpoint without caller-selected windows', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => jsonResponse(aggregate));
    const client = new AdminApiClient(API_BASE_URL, fetchImpl);

    await expect(client.getPlayerActivityAnalytics()).resolves.toEqual(aggregate);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}/admin/v1/analytics/player-activity`);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it.each([
    { ...aggregate, playerId: '11111111-1111-4111-8111-111111111111' },
    { ...aggregate, events: [] },
    { ...aggregate, activePlayers: { ...aggregate.activePlayers, last7Days: -1 } },
    { ...aggregate, returningPlayers7Days: 1.5 },
    { ...aggregate, asOf: 'not-an-iso-timestamp' },
  ])('fails closed on malformed or privacy-expanded payload %#', async (body) => {
    const client = new AdminApiClient(API_BASE_URL, vi.fn<typeof fetch>(async () => jsonResponse(body)));

    const request = client.getPlayerActivityAnalytics();
    await expect(request).rejects.toBeInstanceOf(AdminApiError);
    await expect(request).rejects.toMatchObject({
      kind: 'server',
      code: 'INVALID_PLAYER_ACTIVITY_ANALYTICS_RESPONSE',
    });
  });
});
