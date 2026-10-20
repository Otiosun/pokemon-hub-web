import { CHAMPION_STORE_PRODUCTS } from '../store/championStoreCatalog';

export type FulfillmentReadiness = 'AUTOMATED' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'CONDITIONAL';

/** Readiness is NOT payment status or a promise that a product was delivered. */
export function getStoreFulfillmentReadiness(code: string): FulfillmentReadiness {
  const product = CHAMPION_STORE_PRODUCTS.find((entry) => entry.code === code);
  if (!product || product.available === false) return 'UNAVAILABLE';
  if (product.code === '2XP' || product.code === 'LUCK') return 'AUTOMATED';
  return product.code === 'MASTER' ? 'CONDITIONAL' : 'NOT_CONFIGURED';
}

export function AdminPremiumFulfillmentCatalog() {
  const ready = CHAMPION_STORE_PRODUCTS.filter((product) =>
    getStoreFulfillmentReadiness(product.code) === 'AUTOMATED').length;
  const pending = CHAMPION_STORE_PRODUCTS.filter((product) =>
    getStoreFulfillmentReadiness(product.code) === 'NOT_CONFIGURED').length;
  const conditional = CHAMPION_STORE_PRODUCTS.filter((product) =>
    getStoreFulfillmentReadiness(product.code) === 'CONDITIONAL').length;
  return (
    <section className="premium-delivery-console" aria-label="Produtos da loja e compatibilidade de entrega">
      <header>
        <div><small>CATÁLOGO OFICIAL · CONTROLE DE COMPATIBILIDADE</small>
          <h3>Gamepasses da loja</h3>
        </div>
        <span>{ready} PRONTO</span>
      </header>
      <p>{ready} benefício(s) com executor próprio; {conditional} executor condicionado ao item publicado
        no catálogo ativo do backend; {pending} aguardando definição técnica da entrega.
        <strong> A lista abaixo não autoriza concessões nem confirma pagamentos.</strong></p>
      <div className="premium-fulfillment-status-list">
        {CHAMPION_STORE_PRODUCTS.map((product) => {
          const state = getStoreFulfillmentReadiness(product.code);
          return (
            <div key={product.code}>
              <div><strong>{product.title}</strong><small>{product.code}</small></div>
              <span data-status={state}>
                {state === 'AUTOMATED' ? 'EXECUTOR IMPLEMENTADO'
                  : state === 'UNAVAILABLE' ? 'INDISPONÍVEL NA LOJA'
                    : state === 'CONDITIONAL' ? 'EXECUTOR CONDICIONAL · VERIFICAR CATÁLOGO'
                      : 'ENTREGA POR DEFINIR'}
              </span>
            </div>
          );
        })}
      </div>
      <p>Para itens publicados, use a aba <strong>Itens</strong>. Para Pokémon, ovos e packs, a
        receita precisa ser definida antes de permitir um botão de entrega automática.</p>
    </section>
  );
}
