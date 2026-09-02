import { AdminApiClient as BaseAdminApiClient } from './admin-api';

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
const integerPattern = /^-?\d+$/;
const record = (value: unknown): value is R =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exact = (value: unknown, keys: readonly string[]): value is R =>
  record(value) && Object.keys(value).length === keys.length && keys.every((key) => key in value);
const integers = (value: R, keys: readonly string[], signed: readonly string[] = []) =>
  keys.every(
    (key) =>
      typeof value[key] === 'string' &&
      integerPattern.test(value[key]) &&
      (signed.includes(key) || !value[key].startsWith('-')),
  );
const iso = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

function economyResult(value: unknown): EconomyAnalyticsView {
  if (
    !exact(value, [
      'asOf',
      'window',
      'currencies',
      'currenciesTruncated',
      'inventory',
      'anomalies',
    ]) ||
    !iso(value.asOf) ||
    value.window !== '30d' ||
    !Array.isArray(value.currencies) ||
    value.currencies.length > 32 ||
    typeof value.currenciesTruncated !== 'boolean' ||
    !exact(value.inventory, ['inflowUnits', 'outflowUnits', 'netFlowUnits', 'totalUnitsHeld']) ||
    !integers(
      value.inventory,
      ['inflowUnits', 'outflowUnits', 'netFlowUnits', 'totalUnitsHeld'],
      ['netFlowUnits'],
    ) ||
    !exact(value.anomalies, ['walletProjectionMismatches', 'inventoryProjectionMismatches']) ||
    !integers(value.anomalies, ['walletProjectionMismatches', 'inventoryProjectionMismatches'])
  ) {
    throw new Error('Invalid economy analytics response.');
  }
  for (const currency of value.currencies) {
    if (
      !exact(currency, ['slug', 'displayName', 'inflow', 'outflow', 'netFlow', 'totalBalance']) ||
      typeof currency.slug !== 'string' ||
      currency.slug.length === 0 ||
      typeof currency.displayName !== 'string' ||
      currency.displayName.length === 0 ||
      !integers(
        currency,
        ['inflow', 'outflow', 'netFlow', 'totalBalance'],
        ['netFlow', 'totalBalance'],
      )
    ) {
      throw new Error('Invalid economy analytics response.');
    }
  }
  return value as unknown as EconomyAnalyticsView;
}

type BaseReader = {
  readonly apiBaseUrl: string;
  read<T>(url: URL | string, validate: (value: unknown) => T, invalidCode: string): Promise<T>;
};

export class AdminApiClient extends BaseAdminApiClient {
  public getEconomyAnalytics(): Promise<EconomyAnalyticsView> {
    const base = this as unknown as BaseReader;
    return base.read(
      `${base.apiBaseUrl}/admin/v1/analytics/economy`,
      economyResult,
      'INVALID_ECONOMY_ANALYTICS_RESPONSE',
    );
  }
}
