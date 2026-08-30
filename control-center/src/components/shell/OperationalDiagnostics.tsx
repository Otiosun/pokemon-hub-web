import type { ControlCenterEnvironment } from '../../app/config';
import './shell.css';

export type AdminApiDiagnosticState =
  | 'VALIDANDO SESSÃO'
  | 'CONECTADA · SESSÃO VALIDADA'
  | 'ACESSO BLOQUEADO';

export function environmentLabel(environment: ControlCenterEnvironment): string {
  if (environment === 'production') return 'PRODUÇÃO';
  if (environment === 'staging') return 'STAGING';
  return 'DESENVOLVIMENTO';
}

export function OperationalDiagnostics({
  buildLabel,
  environment,
  apiState,
  inline = false,
}: {
  buildLabel: string;
  environment: ControlCenterEnvironment;
  apiState: AdminApiDiagnosticState;
  inline?: boolean;
}) {
  return (
    <section
      className={`operational-diagnostics${inline ? ' is-inline' : ''}`}
      aria-label="Diagnóstico operacional"
    >
      <span>BUILD {buildLabel}</span>
      <span>AMBIENTE {environmentLabel(environment)}</span>
      <span>ADMIN API {apiState}</span>
    </section>
  );
}
