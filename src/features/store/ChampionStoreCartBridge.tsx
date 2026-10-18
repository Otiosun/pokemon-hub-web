import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { checkoutIntentId, completeCheckoutIntent, createPending2XpOrder } from '../../player-api/playerPortalPremiumCheckoutClient';
import {
  CHAMPION_STORE_BY_CODE,
  formatBrl,
  resolveChampionStoreSku,
  type ChampionStoreProduct,
} from './championStoreCatalog';
import {
  addChampionStoreSku,
  championStoreCartCount,
  championStoreCartHasPriceChanges,
  championStoreCartTotal,
  CHAMPION_STORE_CART_STORAGE_KEY,
  type ChampionStoreCartLine,
  removeChampionStoreSku,
  sanitizeChampionStoreCart,
  setChampionStoreQuantity,
} from './championStoreCartModel';
import './champion-store-cart.css';

type StorePortalTarget = {
  code: string;
  host: HTMLElement;
};

function loadPersistedCart(): ChampionStoreCartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CHAMPION_STORE_CART_STORAGE_KEY);
    return raw ? sanitizeChampionStoreCart(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function StoreCardControl({
  product,
  cart,
  onAdd,
}: {
  product: ChampionStoreProduct;
  cart: readonly ChampionStoreCartLine[];
  onAdd: (productCode: string, variantCode?: string) => void;
}) {
  const [variantCode, setVariantCode] = useState(product.variants?.[0]?.code ?? '');
  const resolved = resolveChampionStoreSku(product.code, variantCode || undefined);
  if (!resolved) return null;

  const line = cart.find((candidate) => candidate.sku === resolved.sku);
  const quantity = line?.quantity ?? 0;
  const isFull = quantity >= resolved.maxQuantity;
  const available = product.available !== false;

  return (
    <div className="store-cart-card-control" data-store-commerce={product.code}>
      {product.variants ? (
        <label className="store-cart-variant-field">
          <span>ESCOLHA</span>
          <select value={variantCode} onChange={(event) => setVariantCode(event.currentTarget.value)}>
            {product.variants.map((variant) => (
              <option key={variant.code} value={variant.code}>
                {variant.label} · {formatBrl(variant.unitPriceCents)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        className="store-cart-add-button"
        onClick={() => onAdd(product.code, variantCode || undefined)}
        disabled={isFull || !available}
      >
        <span>{!available ? 'INDISPONÍVEL POR ENQUANTO' : isFull && resolved.maxQuantity === 1 ? 'NO CARRINHO' : 'ADICIONAR AO CARRINHO'}</span>
        {quantity > 0 && resolved.maxQuantity > 1 ? <strong>{quantity}</strong> : null}
      </button>
      {!available ? (
        <p className="store-cart-availability-note">Mecânica ainda não implementada; novas compras não estão disponíveis.</p>
      ) : null}
    </div>
  );
}

function CartLine({
  line,
  onQuantity,
  onRemove,
}: {
  line: ChampionStoreCartLine;
  onQuantity: (sku: string, quantity: number) => void;
  onRemove: (sku: string) => void;
}) {
  const resolved = resolveChampionStoreSku(line.productCode, line.variantCode);
  if (!resolved) return null;

  const priceChanged = resolved.unitPriceCents !== line.unitPriceSnapshotCents;
  const title = resolved.variantLabel
    ? `${resolved.productTitle} · ${resolved.variantLabel}`
    : resolved.productTitle;

  return (
    <article className="store-cart-line">
      <div className="store-cart-line-heading">
        <span>{resolved.productCode}</span>
        <div>
          <strong>{title}</strong>
          <small>{formatBrl(resolved.unitPriceCents)} cada</small>
        </div>
      </div>

      {priceChanged ? (
        <p className="store-cart-price-warning">
          PREÇO ATUALIZADO · antes {formatBrl(line.unitPriceSnapshotCents)}
        </p>
      ) : null}

      <div className="store-cart-line-actions">
        {resolved.maxQuantity > 1 ? (
          <fieldset className="store-cart-stepper">
            <legend>Quantidade de {title}</legend>
            <button type="button" onClick={() => onQuantity(line.sku, line.quantity - 1)} aria-label="Diminuir quantidade">
              −
            </button>
            <output>{line.quantity}</output>
            <button
              type="button"
              onClick={() => onQuantity(line.sku, line.quantity + 1)}
              disabled={line.quantity >= resolved.maxQuantity}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </fieldset>
        ) : (
          <span className="store-cart-single">1×</span>
        )}

        <strong>{formatBrl(resolved.unitPriceCents * line.quantity)}</strong>
        <button type="button" className="store-cart-remove" onClick={() => onRemove(line.sku)}>
          REMOVER
        </button>
      </div>
    </article>
  );
}

export function ChampionStoreCartBridge() {
  const [cart, setCart] = useState<ChampionStoreCartLine[]>(loadPersistedCart);
  const [portalTargets, setPortalTargets] = useState<StorePortalTarget[]>([]);
  const [storeVisible, setStoreVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [orderState, setOrderState] = useState<
    | { status: 'idle' | 'submitting' }
    | { status: 'created'; humanId: string; totalCents: number }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const creatingOrderRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAMPION_STORE_CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage may be unavailable in hardened/private browser contexts. The cart still works in memory.
    }
  }, [cart]);

  useEffect(() => {
    let disposed = false;
    const createdHosts = new Set<HTMLElement>();

    const scan = () => {
      if (disposed) return;
      const page = document.querySelector('.champion-store-page');
      setStoreVisible(Boolean(page));

      const nextTargets: StorePortalTarget[] = [];
      for (const card of document.querySelectorAll<HTMLElement>('.champion-store-card')) {
        const code = card.querySelector('.champion-store-code')?.textContent?.trim() ?? '';
        if (!CHAMPION_STORE_BY_CODE.has(code)) continue;

        let host = card.querySelector<HTMLElement>('.champion-store-cart-slot');
        if (!host) {
          host = document.createElement('div');
          host.className = 'champion-store-cart-slot';
          const body = card.querySelector('.champion-store-card-body');
          if (!body) continue;
          body.append(host);
          createdHosts.add(host);
        }
        nextTargets.push({ code, host });
      }

      setPortalTargets((previous) => {
        const unchanged =
          previous.length === nextTargets.length &&
          previous.every((target, index) => target.code === nextTargets[index]?.code && target.host === nextTargets[index]?.host);
        return unchanged ? previous : nextTargets;
      });
    };

    const observer = new MutationObserver(scan);
    observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    scan();

    return () => {
      disposed = true;
      observer.disconnect();
      for (const host of createdHosts) host.remove();
    };
  }, []);

  useEffect(() => {
    if (!storeVisible) setOpen(false);
  }, [storeVisible]);

  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!confirmClear) return;
    const timeout = window.setTimeout(() => setConfirmClear(false), 4500);
    return () => window.clearTimeout(timeout);
  }, [confirmClear]);

  const count = championStoreCartCount(cart);
  const total = championStoreCartTotal(cart);
  const hasPriceChanges = championStoreCartHasPriceChanges(cart);
  const canCreate2XpOrder = cart.length === 1 && cart[0]?.sku === '2XP';

  const mutateCart = (
    update: (current: ChampionStoreCartLine[]) => ChampionStoreCartLine[],
  ) => {
    setOrderState({ status: 'idle' });
    setCart(update);
  };

  const createOrder = async () => {
    if (!canCreate2XpOrder || creatingOrderRef.current) return;
    const quantity = cart[0]?.quantity;
    if (!quantity) return;
    creatingOrderRef.current = true;
    setOrderState({ status: 'submitting' });
    try {
      const requestId = checkoutIntentId(quantity, window.localStorage, () => crypto.randomUUID());
      const result = await createPending2XpOrder(quantity, requestId);
      if (result.status === 'created') {
        completeCheckoutIntent(requestId, window.localStorage);
        setOrderState({
          status: 'created',
          humanId: result.order.humanId,
          totalCents: result.order.totalCents,
        });
        return;
      }
      const messages = {
        unauthenticated: 'Entre na sua conta pelo /hub para criar um pedido para o seu personagem.',
        unavailable: 'O pedido real ainda não está disponível neste ambiente. Continue pelo atendimento.',
      } as const;
      setOrderState({
        status: 'error',
        message: result.status === 'rejected'
          ? `Pedido não aceito pelo servidor (${result.code}). Nenhum pagamento foi registrado.`
          : messages[result.status],
      });
    } catch {
      setOrderState({ status: 'error', message: 'Não foi possível registrar o pedido. Tente novamente; a repetição é protegida contra duplicidade.' });
    } finally {
      creatingOrderRef.current = false;
    }
  };

  const summary = useMemo(() => {
    const lines = cart.flatMap((line) => {
      const resolved = resolveChampionStoreSku(line.productCode, line.variantCode);
      if (!resolved) return [];
      const title = resolved.variantLabel
        ? `${resolved.productTitle} · ${resolved.variantLabel}`
        : resolved.productTitle;
      return [`${line.quantity}× ${title} — ${formatBrl(resolved.unitPriceCents * line.quantity)}`];
    });
    return [
      'POKÉMON BEYOND — CHAMPION STORE',
      '',
      ...lines,
      '',
      `TOTAL: ${formatBrl(total)}`,
      'Este resumo não cria nem confirma um pedido. Pagamento e entrega seguem pelo atendimento.',
    ].join('\n');
  }, [cart, total]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2200);
    } catch {
      setCopyStatus('failed');
    }
  };

  const overlay = open ? (
    <div className="store-cart-backdrop">
      <button
        type="button"
        className="store-cart-dismiss-layer"
        onClick={() => setOpen(false)}
        aria-label="Fechar carrinho"
      />
      <section className="store-cart-panel" role="dialog" aria-modal="true" aria-label="Carrinho da Champion Store">
        <header className="store-cart-panel-header">
          <div>
            <small>CHAMPION STORE</small>
            <h2>CARRINHO</h2>
          </div>
          <button type="button" className="store-cart-close" onClick={() => setOpen(false)} aria-label="Fechar carrinho">
            ×
          </button>
        </header>

        <div className="store-cart-panel-body">
          {cart.length === 0 ? (
            <div className="store-cart-empty">
              <span aria-hidden="true">◇</span>
              <strong>CARRINHO VAZIO</strong>
              <p>Escolha uma Gamepass ou pacote no catálogo.</p>
            </div>
          ) : (
            cart.map((line) => (
              <CartLine
                key={line.sku}
                line={line}
                onQuantity={(sku, quantity) => mutateCart((current) => setChampionStoreQuantity(current, sku, quantity))}
                onRemove={(sku) => mutateCart((current) => removeChampionStoreSku(current, sku))}
              />
            ))
          )}
        </div>

        <footer className="store-cart-panel-footer">
          {hasPriceChanges ? (
            <p className="store-cart-global-warning">O catálogo mudou desde que um item foi adicionado. O total abaixo já usa o preço atual.</p>
          ) : null}

          <div className="store-cart-total">
            <span>TOTAL ATUAL</span>
            <strong>{formatBrl(total)}</strong>
          </div>

          <div className="store-cart-footer-actions">
            <button type="button" className="store-cart-copy" disabled={cart.length === 0} onClick={copySummary}>
              {copyStatus === 'copied' ? 'RESUMO COPIADO' : copyStatus === 'failed' ? 'NÃO FOI POSSÍVEL COPIAR' : 'COPIAR RESUMO'}
            </button>
            <button
              type="button"
              className={confirmClear ? 'store-cart-clear is-confirming' : 'store-cart-clear'}
              disabled={cart.length === 0}
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                mutateCart(() => []);
                setConfirmClear(false);
              }}
            >
              {confirmClear ? 'CONFIRMAR LIMPEZA' : 'ESVAZIAR'}
            </button>
          </div>

          {canCreate2XpOrder ? (
            <div className="store-cart-order-create">
              {orderState.status === 'created' ? (
                <div className="store-cart-order-confirmation" role="status">
                  <strong>PEDIDO {orderState.humanId} CRIADO</strong>
                  <span>Valor oficial: {formatBrl(orderState.totalCents)} · PAGAMENTO PENDENTE</span>
                  <small>Guarde o código e informe-o ao atendimento. Nenhuma cobrança ou ativação foi feita.</small>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="store-cart-create-order"
                    disabled={orderState.status === 'submitting'}
                    onClick={() => void createOrder()}
                  >
                    {orderState.status === 'submitting' ? 'REGISTRANDO PEDIDO…' : 'CRIAR PEDIDO 2XP · SEM COBRANÇA'}
                  </button>
                  {orderState.status === 'error' ? (
                    <p className="store-cart-order-error" role="status">{orderState.message}</p>
                  ) : null}
                </>
              )}
            </div>
          ) : cart.length > 0 ? (
            <small className="store-cart-checkout-note">
              Pedido digital disponível apenas para carrinhos contendo exclusivamente XP 2×.
              Os demais itens continuam pelo atendimento.
            </small>
          ) : null}
          <small className="store-cart-checkout-note">
            Criar pedido não confirma pagamento nem entrega benefícios. O servidor calcula o preço oficial.
          </small>
        </footer>
      </section>
    </div>
  ) : null;

  return (
    <>
      {portalTargets.map(({ code, host }) => {
        const product = CHAMPION_STORE_BY_CODE.get(code);
        return product
          ? createPortal(
              <StoreCardControl
                product={product}
                cart={cart}
                onAdd={(productCode, variantCode) => mutateCart((current) => addChampionStoreSku(current, productCode, variantCode))}
              />,
              host,
              code,
            )
          : null;
      })}

      {storeVisible ? (
        <button type="button" className="store-cart-trigger" onClick={() => setOpen(true)} aria-label={`Abrir carrinho com ${count} itens`}>
          <span>CARRINHO</span>
          <strong>{count}</strong>
          <small>{formatBrl(total)}</small>
        </button>
      ) : null}

      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
