export type AdminRewardCatalogItem = {
  itemId: string;
  slug: string;
  displayName: string;
  itemKind: string;
};

export type AdminRewardCatalogCurrency = {
  currencyId: string;
  slug: string;
  displayName: string;
  allowsNegative: boolean;
};

export type AdminRewardCatalogResult =
  | {
      status: 'ok';
      items: AdminRewardCatalogItem[];
      currencies: AdminRewardCatalogCurrency[];
    }
  | { status: 'unauthenticated' | 'forbidden' };

type Fetcher = typeof fetch;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isItem(value: unknown): value is AdminRewardCatalogItem {
  return (
    isRecord(value) &&
    typeof value.itemId === 'string' &&
    UUID_PATTERN.test(value.itemId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    typeof value.itemKind === 'string' &&
    value.itemKind.length > 0
  );
}

function isCurrency(value: unknown): value is AdminRewardCatalogCurrency {
  return (
    isRecord(value) &&
    typeof value.currencyId === 'string' &&
    UUID_PATTERN.test(value.currencyId) &&
    typeof value.slug === 'string' &&
    value.slug.length > 0 &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    typeof value.allowsNegative === 'boolean'
  );
}

export async function getAdminRewardCatalog(
  fetcher: Fetcher = fetch,
): Promise<AdminRewardCatalogResult> {
  const response = await fetcher('/api/hub/admin/reward-catalog', {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (response.status === 401) return { status: 'unauthenticated' };
  if (response.status === 403) return { status: 'forbidden' };
  if (!response.ok) throw new Error(`Admin reward catalog failed (${response.status})`);

  const body = (await response.json()) as unknown;
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    !body.items.every(isItem) ||
    !Array.isArray(body.currencies) ||
    !body.currencies.every(isCurrency)
  ) {
    throw new Error('Invalid admin reward catalog response');
  }

  return {
    status: 'ok',
    items: body.items,
    currencies: body.currencies,
  };
}
