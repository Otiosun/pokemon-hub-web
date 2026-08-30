import type { ControlCenterConfig } from '../../app/config';
import type { AdminSessionState } from '../../features/session/useAdminSession';
import { OperationalDiagnostics } from './OperationalDiagnostics';

export function SessionGate({
  state,
  config,
  onRetry,
}: {
  state: AdminSessionState;
  config: ControlCenterConfig;
  onRetry: () => Promise<void>;
}) {
  const apiState = state.status === 'loading' ? 'VALIDANDO SESSÃO' : 'ACESSO BLOQUEADO';
  const diagnostics = (
    <OperationalDiagnostics
      apiState={apiState}
      buildLabel={config.buildLabel}
      environment={config.environment}
    />
  );

  if (state.status === 'loading') {
    return (
      <main className="session-gate" aria-live="polite">
        <section className="session-card">
          <div className="session-mark" aria-hidden="true">
            ◉
          </div>
          <span className="panel-kicker">POKÉMON CONTROL CENTER</span>
          <h1>Validando acesso administrativo.</h1>
          <p>
            A interface só será carregada depois que a Admin API confirmar sua identidade, principal
            e permissões efetivas.
          </p>
          {diagnostics}
        </section>
      </main>
    );
  }

  if (state.status === 'ready') return null;

  const title =
    state.status === 'unauthenticated'
      ? 'Autenticação administrativa necessária.'
      : state.status === 'forbidden'
        ? 'Esta identidade não possui acesso à Central.'
        : 'A Admin API está indisponível.';
  const copy =
    state.status === 'unauthenticated'
      ? 'A sessão do Cloudflare Access não foi reconhecida. Autentique-se no perímetro administrativo e tente novamente.'
      : state.status === 'forbidden'
        ? 'A identidade externa foi reconhecida, mas não resolve para um principal administrativo ACTIVE autorizado.'
        : 'A Central não conseguiu validar a sessão. Nenhuma ferramenta administrativa foi liberada.';

  return (
    <main className="session-gate">
      <section className="session-card">
        <div className="session-mark" aria-hidden="true">
          !
        </div>
        <span className="panel-kicker">ACESSO BLOQUEADO</span>
        <h1>{title}</h1>
        <p>{copy}</p>
        {diagnostics}
        <div className="session-diagnostic">
          <span>DIAGNÓSTICO</span>
          <code>{state.error.message}</code>
          {state.error.correlationId ? <code>Correlation {state.error.correlationId}</code> : null}
        </div>
        <button className="session-retry" type="button" onClick={() => void onRetry()}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
