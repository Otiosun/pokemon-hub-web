import type { AdminSession } from '../../lib/api/admin-api';
import { environmentLabel } from './OperationalDiagnostics';

export function SessionProfilePanel({
  session,
  roleLabel,
  onClose,
  onReload,
}: {
  session: AdminSession;
  roleLabel: string;
  onClose: () => void;
  onReload: () => Promise<void>;
}) {
  return (
    <section className="session-profile-panel" aria-labelledby="session-profile-title">
      <div className="session-profile-heading">
        <div>
          <span className="eyebrow">MINHA SESSÃO</span>
          <h2 id="session-profile-title">Identidade administrativa atual</h2>
          <p>
            Somente leitura. Estes dados vêm da sessão validada pela Admin API e não concedem
            autoridade ao navegador.
          </p>
        </div>
        <div className="session-profile-actions">
          <button className="secondary-button" type="button" onClick={() => void onReload()}>
            Revalidar sessão
          </button>
          <button className="text-button" type="button" onClick={onClose}>
            Fechar painel
          </button>
        </div>
      </div>

      <dl className="session-profile-summary">
        <div>
          <dt>Perfil visual</dt>
          <dd>{roleLabel}</dd>
        </div>
        <div>
          <dt>Principal</dt>
          <dd>
            <code>{session.principalId}</code>
          </dd>
        </div>
        <div>
          <dt>Ambiente</dt>
          <dd>{environmentLabel(session.environment)}</dd>
        </div>
      </dl>

      <div className="session-profile-grid">
        <section aria-labelledby="session-roles-title">
          <span className="panel-kicker" id="session-roles-title">
            ROLES EFETIVAS
          </span>
          <div className="session-profile-list">
            {session.roles.length > 0 ? (
              session.roles.map((role) => <code key={role}>{role}</code>)
            ) : (
              <span>Nenhuma role efetiva.</span>
            )}
          </div>
        </section>

        <section aria-labelledby="session-capabilities-title">
          <span className="panel-kicker" id="session-capabilities-title">
            CAPABILITIES EFETIVAS
          </span>
          <div className="session-profile-list">
            {session.capabilities.length > 0 ? (
              session.capabilities.map((capability) => (
                <code key={capability.key}>
                  {capability.key} · R{capability.riskTier}
                </code>
              ))
            ) : (
              <span>Nenhuma capability efetiva.</span>
            )}
          </div>
        </section>

        <section aria-labelledby="session-scopes-title">
          <span className="panel-kicker" id="session-scopes-title">
            SCOPES EFETIVOS
          </span>
          <div className="session-profile-list">
            {session.scopes.length > 0 ? (
              session.scopes.map((scope) => (
                <code key={`${scope.scopeType}:${scope.scopeId ?? 'global'}`}>
                  {scope.scopeType}
                  {scope.scopeId ? ` · ${scope.scopeId}` : ' · GLOBAL'}
                </code>
              ))
            ) : (
              <span>Nenhum scope efetivo.</span>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
