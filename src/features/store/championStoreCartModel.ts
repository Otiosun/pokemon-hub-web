import { CHAMPION_STORE_BY_CODE, resolveChampionStoreSku } from './championStoreCatalog';

export const CHAMPION_STORE_CART_STORAGE_KEY = 'pokemon-beyond:champion-store-cart:v1';

export type ChampionStoreCartLine = {
  sku: string;
  productCode: string;
  variantCode?: string;
  quantity: number;
  unitPriceSnapshotCents: number;
};

export type ChampionStoreCart = readonly ChampionStoreCartLine[];

function safeQuantity(value: unknown, maxQuantity: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return 1;
  return Math.max(1, Math.min(maxQuantity, value));
}

export function sanitizeChampionStoreCart(value: unknown): ChampionStoreCartLine[] {
  if (!Array.isArray(value)) return [];

  const bySku = new Map<string, ChampionStoreCartLine>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const record = raw as Record<string, unknown>;
    const productCode = typeof record.productCode === 'string' ? record.productCode : '';
    const variantCode = typeof record.variantCode === 'string' ? record.variantCode : undefined;
    const resolved = resolveChampionStoreSku(productCode, variantCode);
    if (!resolved || CHAMPION_STORE_BY_CODE.get(resolved.productCode)?.available === false) continue;

    const quantity = safeQuantity(record.quantity, resolved.maxQuantity);
    const snapshot =
      typeof record.unitPriceSnapshotCents === 'number' &&
      Number.isSafeInteger(record.unitPriceSnapshotCents) &&
      record.unitPriceSnapshotCents >= 0
        ? record.unitPriceSnapshotCents
        : resolved.unitPriceCents;

    const previous = bySku.get(resolved.sku);
    bySku.set(resolved.sku, {
      sku: resolved.sku,
      productCode: resolved.productCode,
      ...(resolved.variantCode ? { variantCode: resolved.variantCode } : {}),
      quantity: Math.min(resolved.maxQuantity, quantity + (previous?.quantity ?? 0)),
      unitPriceSnapshotCents: previous?.unitPriceSnapshotCents ?? snapshot,
    });
  }

  return [...bySku.values()];
}

export function addChampionStoreSku(
  cart: ChampionStoreCart,
  productCode: string,
  variantCode?: string,
): ChampionStoreCartLine[] {
  const resolved = resolveChampionStoreSku(productCode, variantCode);
  if (!resolved || CHAMPION_STORE_BY_CODE.get(resolved.productCode)?.available === false) return [...cart];

  const existing = cart.find((line) => line.sku === resolved.sku);
  if (!existing) {
    return [
      ...cart,
      {
        sku: resolved.sku,
        productCode: resolved.productCode,
        ...(resolved.variantCode ? { variantCode: resolved.variantCode } : {}),
        quantity: 1,
        unitPriceSnapshotCents: resolved.unitPriceCents,
      },
    ];
  }

  return cart.map((line) =>
    line.sku === resolved.sku
      ? {
          ...line,
          quantity: Math.min(resolved.maxQuantity, line.quantity + 1),
          unitPriceSnapshotCents: resolved.unitPriceCents,
        }
      : line,
  );
}

export function setChampionStoreQuantity(
  cart: ChampionStoreCart,
  sku: string,
  quantity: number,
): ChampionStoreCartLine[] {
  const line = cart.find((candidate) => candidate.sku === sku);
  if (!line) return [...cart];
  const resolved = resolveChampionStoreSku(line.productCode, line.variantCode);
  if (!resolved || CHAMPION_STORE_BY_CODE.get(resolved.productCode)?.available === false) {
    return cart.filter((candidate) => candidate.sku !== sku);
  }
  if (quantity <= 0) return cart.filter((candidate) => candidate.sku !== sku);

  return cart.map((candidate) =>
    candidate.sku === sku
      ? {
          ...candidate,
          quantity: Math.min(resolved.maxQuantity, Math.max(1, Math.trunc(quantity))),
        }
      : candidate,
  );
}

export function removeChampionStoreSku(cart: ChampionStoreCart, sku: string): ChampionStoreCartLine[] {
  return cart.filter((line) => line.sku !== sku);
}

export function championStoreCartCount(cart: ChampionStoreCart): number {
  return cart.reduce((total, line) => total + line.quantity, 0);
}

export function championStoreCartTotal(cart: ChampionStoreCart): number {
  return cart.reduce((total, line) => {
    const resolved = resolveChampionStoreSku(line.productCode, line.variantCode);
    return total + (resolved?.unitPriceCents ?? 0) * line.quantity;
  }, 0);
}

export function championStoreCartHasPriceChanges(cart: ChampionStoreCart): boolean {
  return cart.some((line) => {
    const resolved = resolveChampionStoreSku(line.productCode, line.variantCode);
    return resolved !== null && resolved.unitPriceCents !== line.unitPriceSnapshotCents;
  });
}
