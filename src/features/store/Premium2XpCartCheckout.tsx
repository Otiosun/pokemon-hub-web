import './premium-2xp-checkout.css';
import { useRef, useState } from 'react';
import {
  checkoutIntentId,
  completeCheckoutIntent,
  createPending2XpOrder,
} from '../../player-api/playerPortalPremiumCheckoutClient';
import type { ChampionStoreCartLine } from './championStoreCartModel';
import { formatBrl } from './championStoreCatalog';
import { PremiumStagingSessionGate } from '../admin/PremiumStagingSessionGate';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending'; quantity: number }
  | { kind: 'created'; quantity: number; humanId: string; cents: number }
  | { kind: 'error'; quantity: number; message: string };

export function canShowStaged2XpCheckout(
  cart: readonly ChampionStoreCartLine[],
  flags: { ui: string | undefined; target: string | undefined },
): boolean {
  return flags.ui === '1' && flags.target === 'preview' &&
    cart.length === 1 && cart[0]?.sku === '2XP' &&
    Number.isSafeInteger(cart[0]?.quantity) &&
    (cart[0]?.quantity ?? 0) >= 1 && (cart[0]?.quantity ?? 0) <= 52;
}

/**
 * Preview-only staged order request. No payment, XP grants or non-2XP items.
 * The checkout idempotency ID survives uncertain responses and multi-tab retries.
 */
export function Premium2XpCartCheckout({ cart }: { cart: readonly ChampionStoreCartLine[] }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const sending = useRef(false);
  const item = cart.length === 1 && cart[0]?.sku === '2XP' ? cart[0] : null;
  const quantity = item?.quantity ?? 0;
  const enabled = canShowStaged2XpCheckout(cart, {
    ui: import.meta.env.VITE_PREMIUM_STAGING_UI,
    target: import.meta.env.VITE_PREMIUM_STAGING_TARGET,
  });
  if (!enabled) return null;

  const create = async () => {
    if (sending.current) return;
    sending.current = true;
    setStatus({ kind: 'sending', quantity });
    try {
      const requestId = checkoutIntentId(quantity, window.localStorage, () => crypto.randomUUID());
      const result = await createPending2XpOrder(quantity, requestId);
      if (result.status === 'created') {
        // Only clear the matching intent. A changed cart in another tab keeps its own key.
        completeCheckoutIntent(requestId, window.localStorage);
        setStatus({
          kind: 'created',
          quantity,
          humanId: result.order.humanId,
          cents: result.order.totalCents,
        });
      } else if (result.status === 'unauthenticated') {
        setStatus({ kind: 'error', quantity, message: 'Entre com uma sessão válida do ambiente de testes.' });
      } else if (result.status === 'unavailable') {
        setStatus({ kind: 'error', quantity, message: 'API de staging indisponível. Nenhum pedido foi confirmado.' });
      } else if (result.status === 'rejected') {
        setStatus({ kind: 'error', quantity, message: `Pedido recusado pelo backend (${result.code}).` });
      } else {
        setStatus({ kind: 'error', quantity, message: 'Pedido não confirmado.' });
      }
    } catch {
      setStatus({
        kind: 'error',
        quantity,
        message: 'A resposta do servidor é incerta. Consulte os pedidos antes de tentar novamente; a repetição preserva a chave de segurança.',
      });
    } finally {
      sending.current = false;
    }
  };

  const visible = status.kind !== 'idle' && status.quantity === quantity ? status : null;
  return (
    <PremiumStagingSessionGate access="player">
    <section className="store-cart-stage-checkout" aria-label="Pedido 2XP no ambiente de testes">
      <header><strong>PEDIDO XP 2×</strong><span>STAGING · SEM COBRANÇA</span></header>
      {visible?.kind === 'created' ? (
        <div className="store-cart-stage-result" role="status">
          <strong>PEDIDO {visible.humanId} REGISTRADO</strong>
          <span>Total oficial: {formatBrl(visible.cents)} · PAGAMENTO PENDENTE</span>
          <small>Não foi cobrado nem concedido XP. Guarde o código e confira com a Central Premium de testes.</small>
        </div>
      ) : (
        <>
          <button type="button" disabled={sending.current || visible?.kind === 'sending'}
            onClick={() => void create()}>
            {visible?.kind === 'sending' ? 'REGISTRANDO…' : 'CRIAR PEDIDO 2XP · TESTE'}
          </button>
          {visible?.kind === 'error' ? <p role="status">{visible.message}</p> : null}
        </>
      )}
      <small>Apenas pedidos com XP 2×. Aprovar pagamento e entregar benefício são ações administrativas separadas.</small>
    </section>
    </PremiumStagingSessionGate>
  );
}
