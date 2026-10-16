export type ChampionStoreVariant = {
  code: string;
  label: string;
  unitPriceCents: number;
};

export type ChampionStoreProduct = {
  code: string;
  title: string;
  unitPriceCents: number;
  maxQuantity: number;
  variants?: readonly ChampionStoreVariant[];
};

export type ChampionStoreSku = {
  sku: string;
  productCode: string;
  productTitle: string;
  variantCode?: string;
  variantLabel?: string;
  unitPriceCents: number;
  maxQuantity: number;
};

export const CHAMPION_STORE_PRODUCTS: readonly ChampionStoreProduct[] = [
  { code: 'TERA', title: 'Terastalização', unitPriceCents: 5000, maxQuantity: 1 },
  { code: 'Z', title: 'Movimento Z', unitPriceCents: 3000, maxQuantity: 1 },
  { code: 'GMAX', title: 'Gigantamax', unitPriceCents: 5000, maxQuantity: 1 },
  { code: 'LUCK', title: 'Benção da Sorte', unitPriceCents: 4500, maxQuantity: 1 },
  { code: 'SAVE+', title: 'Save Premium', unitPriceCents: 3500, maxQuantity: 1 },
  { code: 'GEN', title: 'Pokémon Gênesis', unitPriceCents: 6000, maxQuantity: 20 },
  { code: 'GYM', title: 'Insígnia de Ginásio', unitPriceCents: 10000, maxQuantity: 1 },
  { code: 'RED', title: 'Save Red', unitPriceCents: 6000, maxQuantity: 1 },
  {
    code: 'EGG',
    title: 'Ovo Pokémon',
    unitPriceCents: 2000,
    maxQuantity: 20,
    variants: [
      { code: 'COMUM', label: 'Ovo Comum', unitPriceCents: 2000 },
      { code: 'RARO', label: 'Ovo Raro', unitPriceCents: 3000 },
      { code: 'ESPECIAL', label: 'Ovo Especial', unitPriceCents: 4500 },
    ],
  },
  { code: '2XP', title: 'XP em Dobro', unitPriceCents: 4000, maxQuantity: 52 },
  { code: 'RDX', title: 'Rotomdex Ultra', unitPriceCents: 4500, maxQuantity: 1 },
  { code: 'P-U', title: 'Pack Ultra', unitPriceCents: 2500, maxQuantity: 20 },
  { code: 'P-E', title: 'Pack Especial', unitPriceCents: 3000, maxQuantity: 20 },
  { code: 'CAP', title: 'Pack do Capturador', unitPriceCents: 6500, maxQuantity: 20 },
  { code: 'NOITE', title: 'Pack Noturno', unitPriceCents: 3500, maxQuantity: 20 },
  { code: 'AQUA', title: 'Pack Aquático', unitPriceCents: 2000, maxQuantity: 20 },
  { code: 'CUSTOM', title: 'Poké Ball Personalizada', unitPriceCents: 3500, maxQuantity: 20 },
  { code: 'COL', title: 'Caixa do Colecionador', unitPriceCents: 7000, maxQuantity: 20 },
  { code: 'KIT', title: 'Kit do Treinador', unitPriceCents: 10000, maxQuantity: 20 },
  { code: 'MASTER', title: 'Master Ball', unitPriceCents: 10000, maxQuantity: 20 },
  { code: 'ASH', title: 'Save Ash — O Sonho de um Campeão', unitPriceCents: 5000, maxQuantity: 1 },
  { code: 'BROCK', title: 'Save Brock', unitPriceCents: 3500, maxQuantity: 1 },
  { code: 'CYN', title: 'Save Cynthia', unitPriceCents: 4500, maxQuantity: 1 },
] as const;

export const CHAMPION_STORE_BY_CODE = new Map(
  CHAMPION_STORE_PRODUCTS.map((product) => [product.code, product] as const),
);

export function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function resolveChampionStoreSku(
  productCode: string,
  variantCode?: string,
): ChampionStoreSku | null {
  const product = CHAMPION_STORE_BY_CODE.get(productCode);
  if (!product) return null;

  const variant = variantCode
    ? product.variants?.find((candidate) => candidate.code === variantCode)
    : undefined;

  if (product.variants && !variant) return null;

  return {
    sku: variant ? `${product.code}:${variant.code}` : product.code,
    productCode: product.code,
    productTitle: product.title,
    ...(variant ? { variantCode: variant.code, variantLabel: variant.label } : {}),
    unitPriceCents: variant?.unitPriceCents ?? product.unitPriceCents,
    maxQuantity: product.maxQuantity,
  };
}
