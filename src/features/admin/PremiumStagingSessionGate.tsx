import { useEffect, useState, type ReactNode } from 'react';
import {
  exchangePremiumStageTicket,
  readPremiumStageSession,
  signOutPremiumStage,
  type PremiumStageRole,
  type PremiumStageSession,
} from '../../player-api/premiumStagingAuthClient';
import './premium-staging-session-gate.css';
import { currentPremiumManualUiMode } from '../../player-api/premiumManualUiMode';

type GateState = PremiumStageSession | { status: 'loading' };
export function PremiumStagingSessionGate({
  access,
  children,
}: { access: PremiumStageRole; children: ReactNode }) {
  const local = currentPremiumManualUiMode() === 'local';
  const environment = local ? 'API LOCAL' : 'STAGING';
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
        setError('Ticket inválido, usado ou expirado. Use somente um ticket da API autorizada.');
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
      setError(local ? 'Não foi possível encerrar a sessão da API local.' : 'Não foi possível encerrar a sessão de testes.');
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'ready') return (
    <div className="premium-stage-gate-ready">
      <div className="premium-stage-gate-identity">
        <span>{local ? (access === 'owner' ? 'PROPRIETÁRIO LOCAL' : 'TREINADOR LOCAL') : state.label}</span>
        <button type="button" onClick={() => void leave()} disabled={busy}>{`SAIR DA ${environment}`}</button>
      </div>
      {children}
    </div>
  );
  return (
    <section className="premium-stage-gate" aria-live="polite">
      <strong>ACESSO ISOLADO · {environment}</strong>
      {state.status === 'loading' ? (
        <p>{local ? 'Verificando a sessão isolada da API local…' : 'Verificando uma sessão exclusiva do ambiente de testes…'}</p>
      ) : state.status === 'unavailable' ? (
        <p>API Premium não habilitada ou inacessível. Nenhuma entrega ou aprovação financeira foi realizada.</p>
      ) : (
        <>
          <p>{state.status === 'forbidden'
            ? 'Esta sessão não tem a permissão de proprietário exigida.'
            : local ? 'Acesso ao próprio jogo: use um ticket temporário de proprietário emitido pelo seu bot. Nenhum pagamento é confirmado aqui.' : 'A sessão do jogo real não funciona aqui. Entre apenas com um ticket temporário emitido pela API isolada de testes.'}</p>
          <form onSubmit={(event) => { event.preventDefault(); void exchange(); }}>
            <label htmlFor={access === 'owner' ? 'premium-stage-ticket-owner' : 'premium-stage-ticket-player'}>
              TICKET TEMPORÁRIO DA {environment}
            </label>
            <input
              id={access === 'owner' ? 'premium-stage-ticket-owner' : 'premium-stage-ticket-player'}
              type="password"
              autoComplete="off"
              spellCheck={false}
              maxLength={43}
              value={ticket}
              onChange={(event) => setTicket(event.target.value)}
              placeholder="Ticket de login do ambiente autorizado"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !/^[A-Za-z0-9_-]{43}$/.test(ticket.trim())}>
              {busy ? 'VERIFICANDO…' : local ? 'ENTRAR NA API LOCAL' : 'ENTRAR NO STAGING'}
            </button>
          </form>
        </>
      )}
      {error ? <p className="premium-stage-gate-error" role="alert">{error}</p> : null}
    </section>
  );
}
