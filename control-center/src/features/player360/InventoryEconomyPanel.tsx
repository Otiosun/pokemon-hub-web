import type { Player360Overview } from '../../lib/api/admin-api';
import { parsePlayer360Economy } from './player360-economy';

function humanizeSlug(value: string): string {
  return value
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatInteger(value: string): string {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}`;
}

export function InventoryEconomyPanel({ player }: { readonly player: Player360Overview }) {
  let economy;
  try {
    economy = parsePlayer360Economy(player);
  } catch {
    return (
      <section className="inventory-economy-panel" role="alert">
        <span className="panel-kicker">ECONOMIA &amp; INVENTÁRIO</span>
        <h3>Dados econômicos incompatíveis com o contrato atual.</h3>
        <p className="economy-empty">
          A Central bloqueou esta leitura para não apresentar saldo ou quantidade sem validação.
        </p>
      </section>
    );
  }

  const wallets = [...economy.wallets].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, 'pt-BR'),
  );
  const inventory = [...economy.inventory].sort((left, right) =>
    left.slug.localeCompare(right.slug),
  );

  return (
    <section className="inventory-economy-panel" aria-labelledby="inventory-economy-title">
      <div className="inventory-economy-heading">
        <div>
          <span className="panel-kicker">ECONOMIA &amp; INVENTÁRIO</span>
          <h3 id="inventory-economy-title">Saldos primeiro. Itens depois.</h3>
          <p>
            Leitura autoritativa do estado econômico atual. Sem valuation, preço inferido ou ação de
            correção nesta etapa.
          </p>
        </div>
        <span className="muted-badge">READ-ONLY</span>
      </div>

      <section className="economy-section" aria-labelledby="wallets-title">
        <div className="economy-section-heading">
          <div>
            <span className="panel-kicker">SALDOS</span>
            <h4 id="wallets-title">Wallets</h4>
          </div>
          <span className="muted-badge">{wallets.length}</span>
        </div>

        {wallets.length === 0 ? (
          <p className="economy-empty">Nenhuma wallet registrada.</p>
        ) : (
          <div className="wallet-grid">
            {wallets.map((wallet) => (
              <article className="wallet-card" key={wallet.currencyId}>
                <div>
                  <span>{wallet.slug}</span>
                  <strong>{wallet.displayName}</strong>
                </div>
                <strong className="wallet-amount">{formatInteger(wallet.amount)}</strong>
                <small>REV {wallet.revision}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="economy-section" aria-labelledby="inventory-title">
        <div className="economy-section-heading">
          <div>
            <span className="panel-kicker">ITENS</span>
            <h4 id="inventory-title">Inventário</h4>
          </div>
          <span className="muted-badge">{inventory.length}</span>
        </div>

        {inventory.length === 0 ? (
          <p className="economy-empty">Nenhum item registrado.</p>
        ) : (
          <div className="inventory-list">
            {inventory.map((item) => (
              <article className="inventory-row" key={item.itemId}>
                <div>
                  <strong>{humanizeSlug(item.slug)}</strong>
                  <small>{item.slug}</small>
                </div>
                <div className="inventory-quantity">
                  <span>QTD</span>
                  <strong>{formatInteger(item.quantity)}</strong>
                </div>
                <small>REV {item.revision}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
