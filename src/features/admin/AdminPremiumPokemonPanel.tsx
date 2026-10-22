import { useEffect, useRef, useState } from 'react';
import {
  deliverSinglePokemon,
  readDeliveryPokemonForms,
  type DeliveryPokemonForm,
} from '../../player-api/manualPremiumPokemonClient';

export function AdminPremiumPokemonPanel({ playerId }: { playerId: string | null }) {
  const [forms, setForms] = useState<DeliveryPokemonForm[]>([]);
  const [formId, setFormId] = useState('');
  const [level, setLevel] = useState(5);
  const [shiny, setShiny] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const selected = forms.find((form) => form.formId === formId);
  const valid = Boolean(playerId && selected && Number.isSafeInteger(level) && level >= 1 &&
    level <= 100 && reason.trim().length >= 8 && reason.trim().length <= 400);

  useEffect(() => {
    let active = true;
    void readDeliveryPokemonForms()
      .then((catalog) => {
        if (active) { setForms(catalog); setFormId(catalog[0]?.formId ?? ''); }
      })
      .catch(() => { if (active) setNotice('Catálogo de Pokémon indisponível no staging.'); });
    return () => { active = false; };
  }, []);

  const changed = () => {
    requestId.current = null;
    setConfirmed(false);
    setNotice('');
  };

  const deliver = async () => {
    if (!playerId || !selected || !valid || !confirmed || busy) return;
    setBusy(true);
    setNotice('');
    try {
      requestId.current ??= crypto.randomUUID();
      const outcome = await deliverSinglePokemon({
        requestId: requestId.current,
        playerId, formId: selected.formId, level, shiny, reason,
      });
      if (outcome.kind === 'APPLIED') {
        setConfirmed(false);
        setNotice(outcome.replayed
          ? `Esta concessão já foi registrada. Operação ${outcome.operationId}.`
          : `Pokémon criado pela operação auditada ${outcome.operationId}.`);
      } else {
        setNotice({
          UNAUTHORIZED: 'Sua sessão do Hub expirou.',
          FORBIDDEN: 'Esta entrega exige proprietário autorizado.',
          UNAVAILABLE: 'API ou forma Pokémon indisponível no staging.',
          REJECTED: 'Concessão recusada. Confira os registros antes de tentar novamente.',
        }[outcome.code]);
      }
    } catch {
      setNotice('Resultado não confirmado; utilize a mesma requisição para repetir com segurança.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="premium-delivery-console" aria-label="Entrega manual individual de Pokémon">
      <header>
        <div><small>POKÉMON · CRIAÇÃO INDIVIDUAL AUDITADA</small><h3>Conceder Pokémon</h3></div>
        <span>OWNER</span>
      </header>
      <p>Escolha uma forma liberada na versão ativa do jogo e confirme a criação.
        <strong> Isto não entrega automaticamente um ovo ou um pacote comercial</strong>, nem modifica pagamentos.</p>
      {!playerId ? <p className="premium-delivery-notice">Primeiro selecione um treinador.</p> : (
        <div className="premium-delivery-form">
          <label>
            Espécie / forma publicada
            <select value={formId} disabled={busy} onChange={(event) => { changed(); setFormId(event.target.value); }}>
              {forms.map((form) => <option key={form.formId} value={form.formId}>
                {form.displayName} · {form.formSlug}
              </option>)}
            </select>
          </label>
          <label>
            Nível
            <input type="number" min={1} max={100} step={1} value={level} disabled={busy}
              onChange={(event) => { changed(); setLevel(Number(event.target.value)); }} />
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={shiny} disabled={busy}
              onChange={(event) => { changed(); setShiny(event.target.checked); }} />
            <span>Conceder Pokémon Shiny (decisão explícita do proprietário)</span>
          </label>
          {selected ? <p className="premium-delivery-preview">
            <strong>Prévia: {selected.displayName}</strong> · Nível {level} · {shiny ? 'Shiny' : 'Normal'}
            <small>Destino: {playerId} · 1 Pokémon por operação</small>
          </p> : <p className="premium-delivery-notice">Nenhuma forma publicada disponível.</p>}
          <label className="premium-delivery-reason">
            Justificativa administrativa
            <textarea rows={3} minLength={8} maxLength={400} value={reason} disabled={busy}
              placeholder="Ex.: Pokémon avulso concedido após confirmação humana"
              onChange={(event) => { changed(); setReason(event.target.value); }} />
          </label>
          <label className="premium-delivery-confirm">
            <input type="checkbox" checked={confirmed} disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Conferi o destinatário, espécie, nível e Shiny. Confirmo esta criação individual.</span>
          </label>
          {!valid && !busy ? <p className="premium-delivery-requirement" role="status">Selecione uma espécie, um nível válido e justifique em 8 a 400 caracteres.</p> : null}
          <button type="button" disabled={!valid || !confirmed || busy} onClick={() => void deliver()}>
            {busy ? 'CRIANDO…' : 'CONFIRMAR CRIAÇÃO'}
          </button>
          {notice ? <p className="premium-delivery-notice" role="status">{notice}</p> : null}
        </div>
      )}
    </section>
  );
}
