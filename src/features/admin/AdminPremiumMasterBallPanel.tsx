import { useEffect, useRef, useState } from 'react';
import {
  deliverMasterBallPack,
  readMasterBallCatalog,
  type MasterBallCatalog,
} from '../../player-api/manualPremiumMasterBallClient';

/** Commercial SKU delivery; distinct from generic items and human pack cases. */
export function AdminPremiumMasterBallPanel({ playerId }: { playerId: string | null }) {
  const [catalog, setCatalog] = useState<MasterBallCatalog | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const available = catalog?.available === true && catalog.item !== null;
  const valid = Boolean(available && playerId && Number.isSafeInteger(quantity) &&
    quantity >= 1 && quantity <= 20 && reason.trim().length >= 8 && reason.trim().length <= 400);

  useEffect(() => {
    let active = true;
    void readMasterBallCatalog()
      .then((result) => { if (active) setCatalog(result); })
      .catch(() => { if (active) setNotice('Executor MASTER indisponível no staging. Nenhuma concessão possível.'); });
    return () => { active = false; };
  }, []);

  const changed = () => {
    requestId.current = null;
    setConfirmed(false);
    setNotice('');
  };
  const deliver = async () => {
    if (!available || !playerId || !valid || !confirmed || busy) return;
    setBusy(true);
    setNotice('');
    try {
      // Uncertain retries reuse the same UUID; confirmed completion clears it.
      requestId.current ??= crypto.randomUUID();
      const outcome = await deliverMasterBallPack({
        requestId: requestId.current, playerId, quantity, reason,
      });
      if (outcome.kind === 'APPLIED') {
        requestId.current = null;
        setConfirmed(false);
        setNotice(outcome.replayed
          ? `Entrega já registrada. Operação ${outcome.operationId}; sem duplicação.`
          : `MASTER aplicado ao inventário. Operação auditável: ${outcome.operationId}.`);
      } else {
        if (outcome.code === 'NOT_PUBLISHED') {
          setCatalog(null);
          setConfirmed(false);
        }
        setNotice({
          UNAUTHORIZED: 'Sessão de staging expirada. Nenhuma concessão confirmada.',
          FORBIDDEN: 'Apenas o proprietário autorizado pode entregar.',
          UNAVAILABLE: 'API de staging indisponível. Nenhuma concessão confirmada.',
          NOT_PUBLISHED: 'Master Ball indisponível no catálogo publicado. A entrega foi bloqueada.',
          REJECTED: 'Entrega recusada; confira a operação antes de repetir.',
        }[outcome.code]);
      }
    } catch {
      setNotice('Resultado incerto. Consulte operações; uma repetição com os mesmos dados reutiliza o ID.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="premium-delivery-console" aria-label="Executor comercial Master Ball">
      <header>
        <div><small>SKU MASTER · CONCESSÃO POR PRODUTO</small><h3>Master Ball</h3></div>
        <span>OWNER · STAGING</span>
      </header>
      <p>Uma Master Ball por unidade (máximo 20). O próprio servidor identifica o item na
        release publicada; esta tela <strong>não escolhe itemID nem confirma pagamento</strong>.</p>
      {!catalog ? (
        <p role="status" className="premium-delivery-notice">
          {notice || 'Consultando disponibilidade do catálogo publicado…'}
        </p>
      ) : !available ? (
        <p role="status" className="premium-delivery-notice">
          Nenhuma Master Ball única e publicada encontrada. Executor desabilitado, sem concessão.
        </p>
      ) : !playerId ? (
        <p className="premium-delivery-notice">Selecione um treinador de staging acima.</p>
      ) : (
        <div className="premium-delivery-form">
          <p className="premium-delivery-preview">
            <strong>Item conferido no servidor:</strong> {catalog.item?.displayName}
            <small>SKU MASTER · 1 por unidade · Destinatário: {playerId}</small>
          </p>
          <label>Quantidade
            <input type="number" min={1} max={20} step={1} value={quantity} disabled={busy}
              onChange={(event) => { changed(); setQuantity(Number(event.target.value)); }} />
          </label>
          <label className="premium-delivery-reason">Motivo / atendimento
            <textarea rows={3} minLength={8} maxLength={400} value={reason} disabled={busy}
              placeholder="Ex.: Compra conferida externamente, SKU MASTER, 2 unidades."
              onChange={(event) => { changed(); setReason(event.target.value); }} />
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={confirmed} disabled={!valid || busy}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Conferi o treinador, o SKU MASTER, a quantidade e a justificativa. Autorizo a entrega.</span>
          </label>
          <button type="button" disabled={!valid || !confirmed || busy} onClick={() => void deliver()}>
            {busy ? 'APLICANDO…' : 'ENTREGAR MASTER BALL'}
          </button>
          {notice ? <p role="status" className="premium-delivery-notice">{notice}</p> : null}
        </div>
      )}
    </section>
  );
}
