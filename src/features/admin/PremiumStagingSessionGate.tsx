import { useEffect, useState, type ReactNode } from 'react';
import {
  exchangePremiumStageTicket,
  readPremiumStageSession,
  signOutPremiumStage,
  type PremiumStageRole,
  type PremiumStageSession,
} from '../../player-api/premiumStagingAuthClient';
import './premium-staging-session-gate.css';

type GateState = PremiumStageSession | { status: 'loading' };
export function PremiumStagingSessionGate({
  access,
  children,
}: { access: PremiumStageRole; children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: 'loading' });
  const [ticket, setTicket] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    void readPremiumStageSession(access)
      .then((result) => { if (mounted) setState(result); })
      .catch(() => { if (mounted) setState({ status: 'unavailable' }); });
    return () => { mounted = false; };
  }, [access]);

  const exchange = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await exchangePremiumStageTicket(ticket.trim());
      setTicket('');
      if (result === 'unavailable') {
        setState({ status: 'unavailable' });
      } else if (result === 'invalid') {
        setError('Ticket inválido, usado ou expirado. Use somente um ticket do staging isolado.');
      } else {
        setState(await readPremiumStageSession(access));
      }
    } catch {
      setError('Falha de conexão. Nenhuma sessão foi confirmada.');
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOutPremiumStage();
      setState({ status: 'unauthenticated' });
      setTicket('');
    } catch {
      setError('Não foi possível encerrar a sessão de testes.');
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'ready') return (
    <div className="premium-stage-gate-ready">
      <div className="premium-stage-gate-identity">
        <span>{state.label}</span>
        <button type="button" onClick={() => void leave()} disabled={busy}>SAIR DO STAGING</button>
      </div>
      {children}
    </div>
  );
  return (
    <section className="premium-stage-gate" aria-live="polite">
      <strong>ACESSO ISOLADO · STAGING</strong>
      {state.status === 'loading' ? (
        <p>Verificando uma sessão exclusiva do ambiente de testes…</p>
      ) : state.status === 'unavailable' ? (
        <p>API isolada de testes ainda não habilitada. Nenhum pedido, pagamento ou benefício pode ser registrado.</p>
      ) : (
        <>
          <p>{state.status === 'forbidden'
            ? 'A sessão de staging não possui a permissão exigida. Use uma identidade de testes autorizada.'
            : 'A sessão do jogo real não funciona aqui. Entre apenas com um ticket temporário emitido pela API isolada de testes.'}</p>
          <form onSubmit={(event) => { event.preventDefault(); void exchange(); }}>
            <label htmlFor={access === 'owner' ? 'premium-stage-ticket-owner' : 'premium-stage-ticket-player'}>
              TICKET TEMPORÁRIO DO STAGING
            </label>
            <input
              id={access === 'owner' ? 'premium-stage-ticket-owner' : 'premium-stage-ticket-player'}
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={43}
              value={ticket}
              onChange={(event) => setTicket(event.target.value)}
              placeholder="Ticket de login do ambiente isolado"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !/^[A-Za-z0-9_-]{43}$/.test(ticket.trim())}>
              {busy ? 'VERIFICANDO…' : 'ENTRAR NO STAGING'}
            </button>
          </form>
        </>
      )}
      {error ? <p className="premium-stage-gate-error" role="alert">{error}</p> : null}
    </section>
  );
}
