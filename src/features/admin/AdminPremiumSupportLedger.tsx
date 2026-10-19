import { useEffect, useRef, useState } from 'react';
import {
  addPremiumSupportEvent,
  getPremiumSupportEvents,
  type PremiumSupportEvent,
  type PremiumSupportEventKind,
} from '../../player-api/playerPortalAdminPremiumSupportClient';

type LedgerState =
  | { status: 'choose' | 'loading' | 'unavailable' | 'forbidden' | 'unauthenticated' }
  | { status: 'ok'; events: PremiumSupportEvent[] }
  | { status: 'error'; message: string };

const NAMES: Record<PremiumSupportEventKind, string> = {
  NOTE: 'OBSERVAÇÃO',
  REVIEW: 'EM ANÁLISE',
  RESOLVED: 'ATENDIMENTO RESOLVIDO',
};

function timestamp(text: string) {
  const date = new Date(text);
  return Number.isFinite(date.valueOf())
    ? date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Horário indisponível';
}

export function AdminPremiumSupportLedger({
  playerId,
  playerName,
}: {
  playerId: string | null;
  playerName: string | null;
}) {
  const [state, setState] = useState<LedgerState>({ status: 'choose' });
  const [kind, setKind] = useState<PremiumSupportEventKind>('NOTE');
  const [note, setNote] = useState('');
  const [orderId, setOrderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);
  // Retry after a lost response must NOT create a second ledger entry.
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setState({ status: 'choose' });
      return;
    }
    let active = true;
    setState({ status: 'loading' });
    void getPremiumSupportEvents(playerId).then((result) => {
      if (active) setState(result);
    }).catch((error: unknown) => {
      if (active) setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha ao consultar o suporte.',
      });
    });
    return () => { active = false; };
  }, [playerId]);

  const changeDraft = () => {
    requestId.current = null;
    setSubmitError('');
    setSaved(false);
  };

  const save = async () => {
    if (!playerId || saving) return;
    setSaving(true);
    setSubmitError('');
    setSaved(false);
    try {
      requestId.current ??= crypto.randomUUID();
      const result = await addPremiumSupportEvent(playerId, {
        eventId: requestId.current,
        orderId: orderId.trim() || null,
        kind,
        body: note,
      });
      if (result.status !== 'saved') {
        const messages: Record<Exclude<typeof result.status, 'saved'>, string> = {
          unavailable: 'A API de suporte ainda não está implantada neste ambiente.',
          forbidden: 'Você não tem permissão de proprietário para registrar atendimento.',
          unauthenticated: 'Sua sessão expirou. Entre novamente no Hub.',
          invalid: 'Confira o identificador do pedido e o texto da observação.',
          conflict: 'Esta solicitação já foi utilizada com outro conteúdo. Reabra o atendimento.',
        };
        setSubmitError(messages[result.status]);
        return;
      }
      requestId.current = null;
      setNote('');
      setKind('NOTE');
      setOrderId('');
      setSaved(true);
      // The POST is authoritative: present the saved event even if the follow-up
      // GET fails. Never suggest that a successfully persisted note was lost.
      setState((current) => current.status === 'ok'
        ? { status: 'ok', events: [result.event, ...current.events.filter((item) => item.id !== result.event.id)] }
        : current);
      try {
        const refreshed = await getPremiumSupportEvents(playerId);
        if (refreshed.status === 'ok') setState(refreshed);
      } catch {
        // The successful write remains visible until the next history refresh.
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="premium-support-ledger" aria-labelledby="premium-ledger-title">
      <header className="premium-support-ledger-heading">
        <div>
          <span>SUPORTE · ACESSO DO PROPRIETÁRIO</span>
          <h3 id="premium-ledger-title">Histórico de atendimento</h3>
          <p>{playerName ?? 'Selecione um treinador na aba Resumo.'}</p>
        </div>
        <span className="premium-support-ledger-indicator">REGISTRO PERMANENTE</span>
      </header>

      {!playerId ? (
        <p className="premium-support-ledger-notice">Escolha primeiro um jogador em <strong>RESUMO</strong> para consultar ou registrar um atendimento.</p>
      ) : (
        <div className="premium-support-ledger-layout">
          <div className="premium-support-ledger-activity">
            <div className="premium-support-ledger-section-title">
              <strong>LINHA DO TEMPO</strong>
              <span>{state.status === 'ok' ? `${state.events.length} REGISTRO(S)` : 'DADOS OFICIAIS'}</span>
            </div>
            {state.status === 'loading' ? <p className="premium-support-ledger-notice">CONSULTANDO HISTÓRICO…</p> : null}
            {state.status === 'unavailable' ? (
              <p className="premium-support-ledger-notice is-warning">API de suporte indisponível. Nenhum histórico foi inventado.</p>
            ) : null}
            {state.status === 'forbidden' || state.status === 'unauthenticated' ? (
              <p className="premium-support-ledger-notice is-warning">Acesso negado. Esta área exige sessão administrativa com permissão de proprietário.</p>
            ) : null}
            {state.status === 'error' ? <p className="premium-support-ledger-notice is-warning">{state.message}</p> : null}
            {state.status === 'ok' && state.events.length === 0 ? (
              <p className="premium-support-ledger-notice">Ainda não há registros de suporte para este jogador.</p>
            ) : null}
            {state.status === 'ok' ? state.events.map((item) => (
              <article className="premium-support-ledger-event" key={item.id}>
                <header>
                  <strong>{NAMES[item.kind]}</strong>
                  <time dateTime={item.createdAt}>{timestamp(item.createdAt)}</time>
                </header>
                <p>{item.body}</p>
                <small>{item.orderId ? `PEDIDO ${item.orderId}` : 'ATENDIMENTO GERAL'} · AUTOR {item.actorPrincipalId}</small>
              </article>
            )) : null}
          </div>

          <form className="premium-support-ledger-compose" onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}>
            <div className="premium-support-ledger-section-title">
              <strong>NOVO REGISTRO</strong>
              <span>SOMENTE OWNER</span>
            </div>
            <label htmlFor="premium-ledger-kind">Etapa do atendimento</label>
            <select id="premium-ledger-kind" value={kind} disabled={saving}
              onChange={(event) => { changeDraft(); setKind(event.currentTarget.value as PremiumSupportEventKind); }}>
              <option value="NOTE">Observação</option>
              <option value="REVIEW">Em análise</option>
              <option value="RESOLVED">Atendimento resolvido</option>
            </select>
            <label htmlFor="premium-ledger-order">UUID do pedido (opcional)</label>
            <input id="premium-ledger-order" value={orderId} disabled={saving}
              placeholder="Associar a um pedido deste jogador"
              spellCheck={false} autoComplete="off"
              onChange={(event) => { changeDraft(); setOrderId(event.currentTarget.value); }} />
            <label htmlFor="premium-ledger-note">Observação administrativa</label>
            <textarea id="premium-ledger-note" rows={5} value={note} disabled={saving}
              minLength={8} maxLength={1400} required
              placeholder="Descreva a solicitação, o que foi verificado e a orientação dada."
              onChange={(event) => { changeDraft(); setNote(event.currentTarget.value); }} />
            <small>As notas são permanentes, associadas ao administrador autenticado e não podem ser apagadas pela Central.</small>
            {submitError ? <p className="premium-support-ledger-feedback is-error" role="alert">{submitError}</p> : null}
            {saved ? <p className="premium-support-ledger-feedback" role="status">Atendimento registrado no histórico oficial.</p> : null}
            <button type="submit" disabled={saving || state.status !== 'ok' || note.trim().length < 8}>
              {saving ? 'SALVANDO…' : 'REGISTRAR ATENDIMENTO'}
            </button>
            <p className="premium-support-ledger-disclaimer">Resolver um atendimento não registra pagamento nem entrega XP 2×. Essas operações continuam separadas.</p>
          </form>
        </div>
      )}
    </section>
  );
}
