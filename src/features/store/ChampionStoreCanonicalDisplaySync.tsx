import { useLayoutEffect } from 'react';
import { CHAMPION_STORE_BY_CODE, formatBrl, type ChampionStoreProduct } from './championStoreCatalog';

const DOUBLE_XP_COPY =
  'Durante 7 dias, os Pokémon do seu personagem recebem 2× a experiência concedida pelas atividades elegíveis. O bônus acelera o desenvolvimento dos Pokémon sem multiplicar Progressão do Treinador, dinheiro, itens, Pokédex ou chances aleatórias.';

export function championStoreDisplayPrice(product: ChampionStoreProduct): string {
  if (!product.variants?.length) return formatBrl(product.unitPriceCents);
  const lowestPrice = Math.min(...product.variants.map((variant) => variant.unitPriceCents));
  return `A partir de ${formatBrl(lowestPrice)}`;
}

function setTextIfDifferent(node: HTMLElement | undefined | null, value: string): void {
  if (node && node.textContent !== value) node.textContent = value;
}

function syncStoreCard(card: HTMLElement): void {
  const code = card.querySelector<HTMLElement>('.champion-store-code')?.textContent?.trim();
  if (!code) return;

  const product = CHAMPION_STORE_BY_CODE.get(code);
  if (!product) return;

  setTextIfDifferent(
    card.querySelector<HTMLElement>('.champion-store-price strong'),
    championStoreDisplayPrice(product),
  );

  if (product.variants) {
    const renderedVariants = card.querySelectorAll<HTMLElement>('.champion-store-variants > div');
    product.variants.forEach((variant, index) => {
      setTextIfDifferent(
        renderedVariants[index]?.querySelector<HTMLElement>('strong'),
        formatBrl(variant.unitPriceCents),
      );
    });
  }

  if (product.code === '2XP') {
    setTextIfDifferent(card.querySelector<HTMLElement>('.champion-store-copy p'), DOUBLE_XP_COPY);
  }

  card.dataset.canonicalCommerce = 'true';
}

function syncChampionStore(): void {
  for (const card of document.querySelectorAll<HTMLElement>('.champion-store-card')) {
    syncStoreCard(card);
  }
}

export function ChampionStoreCanonicalDisplaySync() {
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let scheduled = false;
    const scheduleSync = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        syncChampionStore();
      });
    };

    syncChampionStore();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
