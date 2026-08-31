import type { Player360Overview } from '../../lib/api/admin-api';

export interface Player360WalletView {
  readonly currencyId: string;
  readonly slug: string;
  readonly displayName: string;
  readonly amount: string;
  readonly revision: string;
  readonly updatedAt: string;
}

export interface Player360InventoryView {
  readonly itemId: string;
  readonly slug: string;
  readonly quantity: string;
  readonly revision: string;
  readonly updatedAt: string;
}

export interface Player360EconomyView {
  readonly wallets: readonly Player360WalletView[];
  readonly inventory: readonly Player360InventoryView[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_PATTERN = /^-?\d+$/;
const NON_NEGATIVE_INTEGER_PATTERN = /^\d+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseWallet(value: unknown): Player360WalletView {
  if (
    !isRecord(value) ||
    !isUuid(value.currencyId) ||
    !nonEmptyString(value.slug) ||
    !nonEmptyString(value.displayName) ||
    typeof value.amount !== 'string' ||
    !INTEGER_PATTERN.test(value.amount) ||
    typeof value.revision !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(value.revision) ||
    !nonEmptyString(value.updatedAt)
  ) {
    throw new Error('Invalid Player 360 wallet.');
  }

  return {
    currencyId: value.currencyId,
    slug: value.slug,
    displayName: value.displayName,
    amount: value.amount,
    revision: value.revision,
    updatedAt: value.updatedAt,
  };
}

function parseInventoryItem(value: unknown): Player360InventoryView {
  if (
    !isRecord(value) ||
    !isUuid(value.itemId) ||
    !nonEmptyString(value.slug) ||
    typeof value.quantity !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(value.quantity) ||
    typeof value.revision !== 'string' ||
    !NON_NEGATIVE_INTEGER_PATTERN.test(value.revision) ||
    !nonEmptyString(value.updatedAt)
  ) {
    throw new Error('Invalid Player 360 inventory item.');
  }

  return {
    itemId: value.itemId,
    slug: value.slug,
    quantity: value.quantity,
    revision: value.revision,
    updatedAt: value.updatedAt,
  };
}

export function parsePlayer360Economy(player: Player360Overview): Player360EconomyView {
  return {
    wallets: player.wallets.map(parseWallet),
    inventory: player.inventory.map(parseInventoryItem),
  };
}
