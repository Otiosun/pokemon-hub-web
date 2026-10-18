import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminPremiumOrderActions } from './AdminPremiumOrderActions';
import {
  getAdminPremiumRead,
  type AdminPremiumReadResult,
  type PremiumReadResource,
  type PremiumOrderStatus,
} from '../../player-api/playerPortalAdminPremiumReadClient';

type ReadState =
  | { status: 'choose' | 'loading' | 'unavailable' | 'forbidden' | 'unauthenticated' }
  | { status: 'error'; message: string }
  | AdminPremiumReadResult;

const LABELS: Record<PremiumOrderStatus, string> = {
  PENDING: 'AGUARDANDO PAGAMENTO',
  PAID: 'PAGAMENTO REGISTRADO',
  APPLIED: 'ENTREGA CONCLUÍDA',
  CANCELLED: 'CANCELADO',
};

function dateText(input: string | null) {
  if (!input) return '—';
  const parsed = new Date(input);
  return Number.isFinite(parsed.valueOf())
    ? parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

function currencyText(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${cents} centavos · ${currency}`;
  }
}

export function AdminPremiumReadPanel({
  playerId,
  playerName,
  resource,
}: {
  playerId: string | null;
  playerName: string | null;
  resource: PremiumReadResource;
}) {
  const [state, setState] = useState<ReadState>({ status: 'choose' });
  const requestSeq = useRef(0);
  const reload = useCallback(() => {
    const seq = ++requestSeq.current;
    if (!playerId) {
      setState({ status: 'choose' });
      return;
    }
    setState({ status: 'loading' });
    void getAdminPremiumRead(playerId, resource)
      .then((result) => {
        if (seq === requestSeq.current) setState(result);
      })
      .catch((error: unknown) => {
        if (seq === requestSeq.current) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Não foi possível consultar a Central Premium.',
          });
        }
      });
  }, [playerId, resource]);
  useEffect(() => {
    reload();
    return () => { requestSeq.current += 1; };
  }, [reload]);

  const title = resource === 'orders' ? 'Pedidos do jogador' : 'Benefícios do jogador';

  return (
    <section className="premium-read-console" aria-live="polite">
      <header className="premium-read-heading">
        <div>
          <span>PREMIUM · CONSULTA PROTEGIDA</span>
          <h3>{title}</h3>
          <small>{playerName ?? 'Nenhum jogador selecionado'}</small>
        </div>
        <span className="premium-read-tag">{resource === 'orders' ? 'REVISÃO DO OWNER' : 'SOMENTE LEITURA'}</span>
      </header>

      {state.status === 'choose' ? (
        <div className="premium-read-message">
          Selecione um jogador na aba <strong>RESUMO</strong> para consultar os registros oficiais.
          Nenhuma compra ou concessão será realizada nesta tela.
        </div>
      ) : null}

      {state.status === 'loading' ? <div className="premium-read-message">CONSULTANDO DADOS OFICIAIS…</div> : null}
      {state.status === 'unavailable' ? (
        <div className="premium-read-message is-warning">
          API administrativa Premium ainda não disponível neste ambiente. Não há dados simulados.
          A leitura exige publicar primeiro o backend com os novos endpoints protegidos.
        </div>
      ) : null}
      {state.status === 'unauthenticated' || state.status === 'forbidden' ? (
        <div className="premium-read-message is-warning">
          ACESSO NEGADO — a sessão atual precisa ter permissão owner para consultar esses registros.
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="premium-read-message is-warning">ERRO DE CONSULTA — {state.message}</div>
      ) : null}

      {state.status === 'ok' && state.orders !== undefined ? (
        state.orders.length === 0 ? (
          <div className="premium-read-message">Nenhum pedido registrado para este jogador.</div>
        ) : (
          <div className="premium-read-list">
            {state.orders.map((order) => (
              <article className="premium-read-record" key={order.id}>
                <header>
                  <strong>{order.humanId}</strong>
                  <span>{LABELS[order.status]}</span>
                </header>
                <div className="premium-read-record-meta">
                  <span>CRIADO {dateText(order.createdAt)}</span>
                  <span>{currencyText(order.totalCents, order.currency)}</span>
                </div>
                <ul>
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.quantity}× {item.title} · {item.sku}</span>
                      <span>{item.fulfilled ? 'ENTREGUE' : 'PENDENTE'}</span>
                    </li>
                  ))}
                </ul>
                <small>PAGO {dateText(order.paidAt)} · APLICADO {dateText(order.appliedAt)}</small>
                <AdminPremiumOrderActions order={order} onUpdated={reload} />
              </article>
            ))}
          </div>
        )
      ) : null}

      {state.status === 'ok' && state.entitlements !== undefined ? (
        state.entitlements.length === 0 ? (
          <div className="premium-read-message">Nenhum benefício registrado para este jogador.</div>
        ) : (
          <div className="premium-read-list">
            {state.entitlements.map((entitlement) => (
              <article className="premium-read-record" key={entitlement.entitlementKey}>
                <header>
                  <strong>{entitlement.entitlementKey}</strong>
                  <span>{entitlement.currentlyActive ? 'ATIVO AGORA' : 'NÃO ATIVO'}</span>
                </header>
                <div className="premium-read-record-meta">
                  <span>{entitlement.grantModel === 'TIMED' ? 'TEMPORÁRIO' : 'PERMANENTE'}</span>
                  <span>{entitlement.administrativeStatus}</span>
                </div>
                <small>
                  INÍCIO {dateText(entitlement.startsAt)} · VALIDADE {dateText(entitlement.expiresAt)}
                </small>
              </article>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
