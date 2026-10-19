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
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const intent = useRef<string | null>(null);
  const selected = products.find((p) => p.sku === sku);
  const valid = Boolean(playerId && selected && Number.isSafeInteger(quantity) &&
    quantity >= 1 && quantity <= (selected?.maxQuantity ?? 0) &&
    reason.trim().length >= 8 && reason.trim().length <= 400);

  useEffect(() => {
    // Switching recipients is a distinct grant intention, never reuse the
    // previous player's idempotency key or confirmation checkbox.
    intent.current = null;
    setConfirmed(false);
  }, [playerId]);

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
    if (playerId) {
      void readManualDeliveryHistory(playerId)
        .then((data) => { if (active) setHistory(data); })
        .catch(() => { if (active) setStatus('Não foi possível consultar o histórico deste treinador.'); });
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
        setHistory(await readManualDeliveryHistory(playerId));
        // Do NOT clear the intent on success: the next delivery requires an
        // explicit input change, avoiding accidental re-issuance on another click.
      } else {
        setStatus({
          unavailable: 'API de entregas indisponível. Nada foi confirmado.',
          forbidden: 'Seu usuário não é proprietário autorizado.',
          unauthenticated: 'Sessão de staging expirada.',
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
      <p>Confirme a compra por fora. Aqui você escolhe <strong>quem recebe, o quê, quanto e por quê</strong>.
        Somente gamepasses com efeito implementado no bot ficam disponíveis.</p>
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
              disabled={busy} placeholder="Ex.: Compra confirmada externamente pelo administrador"
              onChange={(event) => { reset(); setReason(event.target.value); }} />
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={confirmed} disabled={busy || !valid}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Verifiquei o destinatário e autorizo aplicar o benefício agora.</span>
          </label>
          <button type="button" disabled={busy || !valid || !confirmed}
            onClick={() => void deliver()}>
            {busy ? 'REGISTRANDO ENTREGA…' : 'CONFIRMAR ENTREGA'}
          </button>
          {status ? <p role="status" className="premium-delivery-notice">{status}</p> : null}
        </div>
      )}
      <div className="premium-delivery-history">
        <h4>Histórico deste jogador</h4>
        {history.length === 0 ? <p>Nenhuma entrega manual registrada ou histórico ainda indisponível.</p>
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
