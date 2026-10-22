import { useEffect, useRef, useState } from 'react';
import {
  deliverPublishedInventoryItem,
  readDeliveryInventoryCatalog,
  type DeliveryInventoryItem,
} from '../../player-api/manualPremiumInventoryClient';

export function AdminPremiumInventoryPanel({ playerId }: { playerId: string | null }) {
  const [items, setItems] = useState<DeliveryInventoryItem[]>([]);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const item = items.find((entry) => entry.itemId === itemId);
  const valid = Boolean(playerId && item && Number.isSafeInteger(quantity) &&
    quantity >= 1 && quantity <= 1000 && reason.trim().length >= 8 &&
    reason.trim().length <= 400);

  useEffect(() => {
    let active = true;
    void readDeliveryInventoryCatalog()
      .then((catalog) => {
        if (active) { setItems(catalog); setItemId(catalog[0]?.itemId ?? ''); }
      })
      .catch(() => { if (active) setNotice('Catálogo de inventário indisponível.'); });
    return () => { active = false; };
  }, []);

  const changed = () => {
    requestId.current = null;
    setConfirmed(false);
    setNotice('');
  };
  const deliver = async () => {
    if (!playerId || !item || !valid || !confirmed || busy) return;
    setBusy(true);
    setNotice('');
    try {
      requestId.current ??= crypto.randomUUID();
      const outcome = await deliverPublishedInventoryItem({
        requestId: requestId.current,
        playerId,
        itemId: item.itemId,
        quantity,
        reason,
      });
      if (outcome.kind === 'APPLIED') {
        setConfirmed(false);
        setNotice(outcome.replayed
          ? `Entrega já registrada. Operação ${outcome.operationId}. Nada duplicado.`
          : `Item adicionado ao inventário. Registro auditável: ${outcome.operationId}.`);
      } else {
        setNotice({
          UNAUTHORIZED: 'Sessão de testes expirada.',
          FORBIDDEN: 'Apenas o proprietário autorizado pode entregar.',
          UNAVAILABLE: 'API Premium não disponível; nenhuma entrega confirmada.',
          REJECTED: 'Entrega recusada pelo bot. Confira os registros antes de tentar novamente.',
        }[outcome.code]);
      }
    } catch {
      setNotice('Resultado não confirmado. Repetir os mesmos dados utiliza o mesmo ID para não duplicar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="premium-delivery-console" aria-label="Entregas de itens do inventário">
      <header>
        <div><small>INVENTÁRIO · OPERAÇÃO AUDITADA</small><h3>Adicionar itens</h3></div>
        <span>OWNER</span>
      </header>
      <p>Use para entregas avulsas de itens existentes no jogo. <strong>Não equivale a entregar
        um pacote comercial inteiro</strong>: os componentes de cada pack precisam ser conferidos.</p>
      {!playerId ? <p className="premium-delivery-notice">Selecione um treinador acima.</p> : (
        <div className="premium-delivery-form">
          <label>
            Item publicado no jogo
            <select value={itemId} disabled={busy} onChange={(event) => { changed(); setItemId(event.target.value); }}>
              {items.map((entry) =>
                <option key={entry.itemId} value={entry.itemId}>{entry.displayName} · {entry.slug}</option>)}
            </select>
          </label>
          <label>
            Quantidade
            <input type="number" min={1} max={1000} step={1} value={quantity} disabled={busy}
              onChange={(event) => { changed(); setQuantity(Number(event.target.value)); }} />
          </label>
          {item ? <p className="premium-delivery-preview">
            <strong>Prévia:</strong> +{quantity} {item.displayName}
            <small>Inventário do jogador: {playerId}</small>
          </p> : <p className="premium-delivery-notice">Nenhum item publicado disponível para concessão.</p>}
          <label className="premium-delivery-reason">
            Motivo / referência do atendimento
            <textarea rows={3} minLength={8} maxLength={400} value={reason}
              disabled={busy} placeholder="Ex.: Pacote recebido externamente, item 1 de 3"
              onChange={(event) => { changed(); setReason(event.target.value); }} />
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={confirmed} disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Conferi o treinador, o item e a quantidade. Autorizo esta entrega individual.</span>
          </label>
          {!valid && !busy ? <p className="premium-delivery-requirement" role="status">Falta informar um motivo válido (8 a 400 caracteres), selecionar um item e conferir a quantidade.</p> : null}
          <button type="button" disabled={!valid || !confirmed || busy} onClick={() => void deliver()}>
            {busy ? 'APLICANDO…' : 'ENTREGAR ITENS'}
          </button>
          {notice ? <p role="status" className="premium-delivery-notice">{notice}</p> : null}
        </div>
      )}
    </section>
  );
}
