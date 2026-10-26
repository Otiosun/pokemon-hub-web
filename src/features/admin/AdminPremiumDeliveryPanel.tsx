import { useEffect, useRef, useState } from 'react';
import {
  readManualDeliveryCatalog,
  readManualDeliveryHistory,
  submitManualDelivery,
  type DeliveryProduct,
  type ManualDeliveryEntry,
} from '../../player-api/manualPremiumDeliveryClient';
import './admin-premium-delivery.css';

export function AdminPremiumDeliveryPanel({ playerId }: { playerId: string | null }) {
  const [products, setProducts] = useState<DeliveryProduct[]>([]);
  const [history, setHistory] = useState<ManualDeliveryEntry[]>([]);
  const [historyState, setHistoryState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const intent = useRef<string | null>(null);
  const selected = products.find((p) => p.sku === sku);
  const reasonLength = reason.trim().length;
  const reasonValid = reasonLength >= 8 && reasonLength <= 400;
  const quantityValid = Number.isSafeInteger(quantity) && quantity >= 1 &&
    quantity <= (selected?.maxQuantity ?? 0);
  const valid = Boolean(playerId && selected && quantityValid && reasonValid);
  const missing = !reasonValid
    ? `Escreva um motivo verificável (mínimo de 8 caracteres; faltam ${Math.max(0, 8 - reasonLength)}).`
    : !quantityValid ? 'Confira a quantidade permitida para este benefício.'
      : !confirmed ? 'Marque a confirmação para habilitar a entrega.' : null;

  useEffect(() => {
    let active = true;
    void readManualDeliveryCatalog()
      .then((data) => {
        if (active) {
          setProducts(data);
          setSku(data[0]?.sku ?? '');
        }
      })
      .catch(() => { if (active) setStatus('Catálogo indisponível. Nenhuma entrega foi autorizada.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setHistory([]);
    setHistoryState(playerId ? 'loading' : 'idle');
    if (playerId) {
      void readManualDeliveryHistory(playerId)
        .then((data) => { if (active) { setHistory(data); setHistoryState('ready'); } })
        .catch(() => { if (active) setHistoryState('error'); });
    }
    return () => { active = false; };
  }, [playerId]);

  const reset = () => {
    // A changed input is a different owner decision. Failed/uncertain HTTP
    // responses retain the SAME requestId for safe retries.
    intent.current = null;
    setConfirmed(false);
    setStatus('');
  };
  const deliver = async () => {
    if (!playerId || !selected || !valid || !confirmed || busy) return;
    setBusy(true);
    setStatus('');
    try {
      intent.current ??= crypto.randomUUID();
      const result = await submitManualDelivery({
        requestId: intent.current,
        playerId,
        sku: selected.sku,
        quantity,
        reason,
      });
      if (result.status === 'applied') {
        setConfirmed(false);
        setStatus(result.replayed
          ? 'Entrega já registrada anteriormente. Nenhum benefício duplicado.'
          : 'Entrega aplicada ao jogador e registrada no histórico.');
        try {
          const updatedHistory = await readManualDeliveryHistory(playerId);
          setHistory(updatedHistory);
          setHistoryState('ready');
        } catch {
          setHistoryState('error');
          // Successful delivery is still confirmed; audit reload failing does not undo it.
        }
        // Do NOT clear the intent on success: the next delivery requires an
        // explicit input change, avoiding accidental re-issuance on another click.
      } else {
        setStatus({
          unavailable: 'A API de entregas não está disponível nesta versão do servidor. Nenhuma entrega foi confirmada.',
          forbidden: 'Você não tem a permissão premium.delivery.grant. Solicite delegação ao proprietário.',
          unauthenticated: 'Sua sessão do Hub expirou. Entre novamente para continuar.',
          'product-unavailable': 'Este Gamepass não está publicado para entrega no backend. Nenhum benefício foi concedido.',
          conflict: 'Entrega em conflito com o estado atual. Consulte o histórico antes de tentar novamente.',
          rejected: 'Entrega recusada pelo servidor. Confira o histórico e tente novamente.',
        }[result.status]);
      }
    } catch {
      setStatus('Resultado incerto. Verifique o histórico; repetir com os mesmos dados mantém a chave da primeira tentativa.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="premium-delivery-console" aria-label="Entregas manuais de gamepasses">
      <header>
        <div><small>ENTREGA MANUAL · SEM SISTEMA DE PAGAMENTO</small><h3>Conceder benefício</h3></div>
        <span>OWNER</span>
      </header>
      <p>Após verificar o pagamento fora do sistema, escolha o benefício e registre a justificativa.
        <strong> Nenhuma compra é aprovada automaticamente.</strong></p>
      {!playerId ? (
        <p className="premium-delivery-notice">Primeiro consulte o Player ID do treinador na área acima.</p>
      ) : (
        <div className="premium-delivery-form">
          <label>
            Gamepass
            <select value={sku} disabled={busy || loading} onChange={(event) => { reset(); setSku(event.target.value); }}>
              {products.map((product) => <option key={product.sku} value={product.sku}>{product.title} · {product.sku}</option>)}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" min={1} max={selected?.maxQuantity ?? 1} step={1}
              value={quantity} disabled={busy}
              onChange={(event) => { reset(); setQuantity(Number(event.target.value)); }} />
          </label>
          {selected ? (
            <p className="premium-delivery-preview">
              <strong>Prévia:</strong> {quantity}× {selected.title}
              {selected.durationSecondsPerUnit ? (
                <> · {Math.round(selected.durationSecondsPerUnit * quantity / 86400)} dias de benefício</>
              ) : (<> · permanente</>)}
              <small> Destino: {playerId}</small>
            </p>
          ) : <p className="premium-delivery-notice">Nenhum benefício automático configurado.</p>}
          <label className="premium-delivery-reason">
            Motivo / comprovante verificado pelo ADM
            <textarea value={reason} minLength={8} maxLength={400} rows={3}
              disabled={busy} aria-describedby="premium-delivery-reason-hint"
              placeholder="Ex.: Pedido conferido externamente e autorizado pelo administrador."
              onChange={(event) => { reset(); setReason(event.target.value); }} />
            <small id="premium-delivery-reason-hint" className={reasonLength > 0 && !reasonValid ? 'is-warning' : undefined}>
              {reasonLength < 8
                ? `Mínimo de 8 caracteres · ${reasonLength}/8`
                : `${reasonLength}/400 caracteres · justificativa preenchida`}
            </small>
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={confirmed} disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span><strong>Confirmo a identidade do jogador e esta entrega.</strong>
              <small>Verifiquei o benefício, a quantidade e o comprovante antes de autorizar.</small>
            </span>
          </label>
          {missing && !busy ? <p className="premium-delivery-requirement" role="status">{missing}</p> : null}
          <button type="button" disabled={busy || !valid || !confirmed}
            onClick={() => void deliver()}>
            {busy ? 'REGISTRANDO ENTREGA…' : 'CONFIRMAR ENTREGA'}
          </button>
          {status ? <p role="status" className="premium-delivery-notice">{status}</p> : null}
        </div>
      )}
      <div className="premium-delivery-history">
        <h4>Histórico deste jogador</h4>
        {historyState === 'idle' ? <p>Selecione o jogador para consultar as entregas.</p>
          : historyState === 'loading' ? <p>Consultando histórico…</p>
            : historyState === 'error' ? <p role="status" className="premium-history-error">
                Não foi possível carregar o histórico. Isso não significa que não existam entregas.
              </p>
              : history.length === 0 ? <p>Nenhuma entrega manual registrada para este jogador.</p>
                : <ul>{history.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.quantity}× {entry.sku}</strong>
                <span>{entry.reason}</span>
                <small>{new Date(entry.createdAt).toLocaleString('pt-BR')} · ADM {entry.actorPrincipalId}</small>
              </li>
            ))}</ul>}
      </div>
    </section>
  );
}
