import { describe, expect, it, vi } from 'vitest';
import { AdminApiClient } from './admin-api-f83';

const API = 'https://admin-api.example.com';

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function economy(currency: { slug: string; displayName: string }) {
  return {
    asOf: '2026-09-02T12:00:00.000Z',
    window: '30d',
    currencies: [
      {
        ...currency,
        inflow: '1',
        outflow: '0',
        netFlow: '1',
        totalBalance: '1',
      },
    ],
    currenciesTruncated: false,
    inventory: {
      inflowUnits: '0',
      outflowUnits: '0',
      netFlowUnits: '0',
      totalUnitsHeld: '0',
    },
    anomalies: {
      walletProjectionMismatches: '0',
      inventoryProjectionMismatches: '0',
    },
  } as const;
}

describe('F8.3 economy analytics adversarial response contract', () => {
  it('rejects currency labels the canonical backend output schema would reject', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(economy({ slug: '   ', displayName: 'Poké Dollar' })))
      .mockResolvedValueOnce(
        jsonResponse(economy({ slug: 'poke-dollar', displayName: 'x'.repeat(161) })),
      );
    const client = new AdminApiClient(API, fetchImpl);

    await expect(client.getEconomyAnalytics()).rejects.toMatchObject({
      code: 'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    });
    await expect(client.getEconomyAnalytics()).rejects.toMatchObject({
      code: 'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    });
  });
});
