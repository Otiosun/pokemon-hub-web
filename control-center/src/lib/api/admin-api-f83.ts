import { AdminApiClient as BaseAdminApiClient, AdminApiError } from './admin-api';

export * from './admin-api';

export interface EconomyAnalyticsView {
  readonly asOf: string;
  readonly window: '30d';
  readonly currencies: readonly {
    readonly slug: string;
    readonly displayName: string;
    readonly inflow: string;
    readonly outflow: string;
    readonly netFlow: string;
    readonly totalBalance: string;
  }[];
  readonly currenciesTruncated: boolean;
  readonly inventory: {
    readonly inflowUnits: string;
    readonly outflowUnits: string;
    readonly netFlowUnits: string;
    readonly totalUnitsHeld: string;
  };
  readonly anomalies: {
    readonly walletProjectionMismatches: string;
    readonly inventoryProjectionMismatches: string;
  };
}

type R = Record<string, unknown>;
const unsigned = /^\d+$/;
const signed = /^-?\d+$/;
const record = (value: unknown): value is R =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: unknown, keys: readonly string[]): value is R =>
  record(value) && Object.keys(value).length === keys.length && keys.every((key) => key in value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const integer = (value: unknown, allowNegative = false): value is string =>
  typeof value === 'string' && (allowNegative ? signed : unsigned).test(value);
const iso = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

function economyResult(value: unknown): EconomyAnalyticsView {
  if (
    !exact(value, ['asOf', 'window', 'currencies', 'currenciesTruncated', 'inventory', 'anomalies']) ||
    !iso(value.asOf) ||
    value.window !== '30d' ||
    !Array.isArray(value.currencies) ||
    value.currencies.length > 32 ||
    typeof value.currenciesTruncated !== 'boolean' ||
    !exact(value.inventory, ['inflowUnits', 'outflowUnits', 'netFlowUnits', 'totalUnitsHeld']) ||
    !integer(value.inventory.inflowUnits) ||
    !integer(value.inventory.outflowUnits) ||
    !integer(value.inventory.netFlowUnits, true) ||
    !integer(value.inventory.totalUnitsHeld) ||
    !exact(value.anomalies, ['walletProjectionMismatches', 'inventoryProjectionMismatches']) ||
    !integer(value.anomalies.walletProjectionMismatches) ||
    !integer(value.anomalies.inventoryProjectionMismatches)
  ) {
    throw new Error('Invalid economy analytics response.');
  }
  for (const currency of value.currencies) {
    if (
      !exact(currency, ['slug', 'displayName', 'inflow', 'outflow', 'netFlow', 'totalBalance']) ||
      !text(currency.slug) ||
      !text(currency.displayName) ||
      !integer(currency.inflow) ||
      !integer(currency.outflow) ||
      !integer(currency.netFlow, true) ||
      !integer(currency.totalBalance, true)
    ) {
      throw new Error('Invalid economy analytics response.');
    }
  }
  return value as unknown as EconomyAnalyticsView;
}

export class AdminApiClient extends BaseAdminApiClient {
  public constructor(
    private readonly f83ApiBaseUrl: string,
    private readonly f83Fetch: typeof fetch = fetch,
  ) {
    super(f83ApiBaseUrl, f83Fetch);
  }

  public async getEconomyAnalytics(): Promise<EconomyAnalyticsView> {
    let response: Response;
    try {
      response = await this.f83Fetch(`${this.f83ApiBaseUrl}/admin/v1/analytics/economy`, {
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
    } catch {
      throw new AdminApiError(
        'network',
        'Não foi possível alcançar a Admin API.',
        null,
        'NETWORK_ERROR',
        null,
      );
    }
    if (!response.ok) {
      throw new AdminApiError(
        response.status === 403 ? 'forbidden' : response.status === 401 ? 'unauthenticated' : 'server',
        'A consulta de economia falhou.',
        response.status,
        `HTTP_${response.status}`,
        response.headers.get('x-correlation-id'),
      );
    }
    try {
      return economyResult(await response.json());
    } catch {
      throw new AdminApiError(
        'server',
        'A resposta administrativa é inválida.',
        200,
        'INVALID_ECONOMY_ANALYTICS_RESPONSE',
        response.headers.get('x-correlation-id'),
      );
    }
  }
}
