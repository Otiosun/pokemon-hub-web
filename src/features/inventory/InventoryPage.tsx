import { useEffect, useMemo, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import {
  getPlayerPortalInventory,
  type PlayerPortalInventoryItem,
} from '../../player-api/playerPortalClient';
import './inventory-page.css';

type InventoryState =
  | { status: 'loading' }
  | { status: 'authenticated'; inventory: readonly PlayerPortalInventoryItem[] }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

function quantityLabel(quantity: string) {
  try {
    return BigInt(quantity).toLocaleString('pt-BR');
  } catch {
    return quantity;
  }
}

export function InventoryPage() {
  const [state, setState] = useState<InventoryState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getPlayerPortalInventory()
      .then((result) => {
        if (cancelled) return;
        setState(result);
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inventory = useMemo(
    () =>
      state.status === 'authenticated'
        ? [...state.inventory].sort((left, right) =>
            left.displayName.localeCompare(right.displayName, 'pt-BR'),
          )
        : [],
    [state],
  );

  const totalKinds = inventory.length;

  return (
    <main className="inventory-page">
      <HubModuleHeader
        module="journey"
        metaLabel="INVENTÁRIO"
        metaValue={
          state.status === 'authenticated'
            ? `${totalKinds} ITEM${totalKinds === 1 ? '' : 'S'}`
            : state.status === 'loading'
              ? 'SINCRONIZANDO'
              : 'INDISPONÍVEL'
        }
      />

      <section className="inventory-shell">
        <header className="inventory-head">
          <div>
            <span>REGISTRO DO TREINADOR</span>
            <h1>Inventário</h1>
            <p>Itens e quantidades sincronizados com o estado oficial do RPG.</p>
          </div>
          <a href="/jornada" data-nav-mode="up">VOLTAR À JORNADA</a>
        </header>

        {state.status === 'loading' ? (
          <div className="inventory-state">Sincronizando inventário oficial…</div>
        ) : state.status === 'unauthenticated' ? (
          <div className="inventory-state">
            Sua sessão não está ativa. Abra o Hub novamente pelo acesso do bot.
          </div>
        ) : state.status === 'unavailable' ? (
          <div className="inventory-state">
            Não foi possível consultar o inventário agora.
          </div>
        ) : inventory.length === 0 ? (
          <div className="inventory-state">Nenhum item registrado no inventário.</div>
        ) : (
          <div className="inventory-grid">
            {inventory.map((item) => (
              <article className="inventory-item" key={item.itemId}>
                <span className="inventory-item-index" aria-hidden="true">ITEM</span>
                <div>
                  <strong>{item.displayName}</strong>
                  <small>{item.itemSlug}</small>
                </div>
                <span className="inventory-item-quantity">× {quantityLabel(item.quantity)}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
