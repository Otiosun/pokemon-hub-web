import type { PlayerPortalAdminAccess } from '../../player-api/playerPortalAdminClient';
import './admin-shell.css';

type AdminShellPageProps = {
  admin: PlayerPortalAdminAccess;
};

const DOMAINS = [
  ['player.', 'JOGADORES'],
  ['pokemon.', 'POKÉMON'],
  ['inventory.', 'INVENTÁRIO'],
  ['economy.', 'ECONOMIA'],
  ['progression.', 'PROGRESSÃO'],
  ['pokedex.', 'POKÉDEX'],
  ['world.', 'MUNDO'],
  ['battle.', 'BATALHAS'],
  ['content.', 'CONTEÚDO'],
  ['audit.', 'AUDITORIA'],
  ['admin.', 'SEGURANÇA ADM'],
] as const;

export function AdminShellPage({ admin }: AdminShellPageProps) {
  const maxRisk = Math.max(...admin.capabilities.map((capability) => capability.riskTier));
  const globalScope = admin.scopes.some(
    (scope) => scope.scopeType === 'GLOBAL' && scope.scopeId === null,
  );
  const visibleDomains = DOMAINS.filter(([prefix]) =>
    admin.capabilities.some((capability) => capability.key.startsWith(prefix)),
  );

  return (
    <main className="admin-shell">
      <header className="admin-shell-header">
        <div>
          <small>POKÉMON BEYOND · ACESSO RESTRITO</small>
          <h1>CENTRAL ADM</h1>
          <p>Autorização confirmada pelo servidor. Nenhuma ferramenta administrativa é executada por esta tela ainda.</p>
        </div>
        <span className="admin-shell-lock" aria-hidden="true">ADM</span>
      </header>

      <section className="admin-shell-status" aria-label="Resumo da autorização administrativa">
        <div>
          <small>CAPABILITIES</small>
          <strong>{admin.capabilities.length}</strong>
        </div>
        <div>
          <small>RISCO MÁX.</small>
          <strong>R{maxRisk}</strong>
        </div>
        <div>
          <small>ESCOPO</small>
          <strong>{globalScope ? 'GLOBAL' : 'LIMITADO'}</strong>
        </div>
      </section>

      <section className="admin-shell-foundation">
        <div className="admin-shell-section-heading">
          <small>FUNDAÇÃO</small>
          <h2>Áreas autorizadas</h2>
        </div>
        <div className="admin-shell-domain-grid">
          {visibleDomains.map(([, label]) => (
            <article key={label} className="admin-shell-domain">
              <span>{label}</span>
              <small>Disponível para definição</small>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-shell-notice">
        <strong>PAINEL EM CONSTRUÇÃO CONTROLADA</strong>
        <p>As ferramentas serão adicionadas por capability, com validação novamente no backend, auditoria e confirmação proporcional ao risco.</p>
      </section>
    </main>
  );
}
