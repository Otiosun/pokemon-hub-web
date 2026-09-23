import { HubMenuTrigger } from '../../components/HubNavigation';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';

const MODULES = [
  {
    id: 'players',
    title: 'JOGADORES',
    detail: 'Perfis, acesso, progressão, localização e suporte.',
    prefixes: ['player.', 'progression.', 'pokedex.'],
    href: '/admin/players',
  },
  {
    id: 'pokemon',
    title: 'POKÉMON',
    detail: 'Roster, edição, movimentos, efeitos e ciclo de vida.',
    prefixes: ['pokemon.', 'effect.', 'effects.'],
  },
  {
    id: 'economy',
    title: 'ECONOMIA',
    detail: 'Inventário, wallet, recompensas e ajustes.',
    prefixes: ['inventory.', 'wallet.', 'economy.', 'reward.'],
  },
  {
    id: 'world',
    title: 'MUNDO E BATALHA',
    detail: 'Encontros, batalhas, regiões e correções operacionais.',
    prefixes: ['world.', 'encounter.', 'battle.'],
  },
  {
    id: 'content',
    title: 'CONTEÚDO',
    detail: 'Drafts, validação, publicação e rollback de releases.',
    prefixes: ['content.'],
  },
  {
    id: 'security',
    title: 'ADMINISTRAÇÃO',
    detail: 'Auditoria, cargos, capacidades e operações sensíveis.',
    prefixes: ['audit.', 'admin_', 'admin.', 'community.', 'batch.', 'UAT_'],
  },
] as const;

function relevantCapabilities(capabilities: readonly string[], prefixes: readonly string[]) {
  return capabilities.filter((capability) =>
    prefixes.some((prefix) => capability.startsWith(prefix)),
  );
}

function HiddenAdminRoute() {
  return (
    <main className="admin-page admin-page-hidden">
      <section>
        <span>404</span>
        <strong>ENDEREÇO INDISPONÍVEL</strong>
        <a href="/jornada">VOLTAR À JORNADA</a>
      </section>
    </main>
  );
}

export function AdminPage() {
  const state = usePlayerPortalAdmin();

  if (state.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div>
            <small>POKÉMON BEYOND</small>
            <strong>CENTRAL ADM</strong>
          </div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">VALIDANDO CREDENCIAL ADMINISTRATIVA…</section>
      </main>
    );
  }

  if (state.status !== 'admin') return <HiddenAdminRoute />;

  const capabilities = state.admin.capabilities;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div>
          <small>POKÉMON BEYOND</small>
          <strong>CENTRAL ADM</strong>
        </div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell">
        <div className="admin-intro">
          <div>
            <span className="admin-kicker">ACESSO RESTRITO</span>
            <h1>Central administrativa</h1>
            <p>
              A interface só é montada para identidades administrativas ativas. As permissões
              abaixo vêm do backend e não do navegador.
            </p>
          </div>
          <div className="admin-access-card">
            <span>ESTADO</span>
            <strong>AUTORIZADO</strong>
            <small>{capabilities.length} capacidades ativas</small>
          </div>
        </div>

        <section className="admin-module-grid" aria-label="Módulos administrativos">
          {MODULES.map((module) => {
            const grants = relevantCapabilities(capabilities, module.prefixes);
            const available = grants.length > 0;
            const className = `admin-module-card${available ? ' is-authorized' : ' is-unavailable'}`;
            const content = (
              <>
                <header>
                  <span>{module.title}</span>
                  <strong>{available ? 'AUTORIZADO' : 'SEM ACESSO'}</strong>
                </header>
                <p>{module.detail}</p>
                <footer>
                  <span>{grants.length} permissões</span>
                  <small>
                    {'href' in module && module.href && available ? 'ABRIR PLAYER 360' : 'INTERFACE EM CONSTRUÇÃO'}
                  </small>
                </footer>
              </>
            );

            return 'href' in module && module.href && available ? (
              <a key={module.id} className={`${className} is-link`} href={module.href}>
                {content}
              </a>
            ) : (
              <article key={module.id} className={className}>
                {content}
              </article>
            );
          })}
        </section>

        <section className="admin-capabilities">
          <header>
            <span>PERMISSÕES EFETIVAS</span>
            <strong>{capabilities.length}</strong>
          </header>
          <div>
            {capabilities.map((capability) => (
              <code key={capability}>{capability}</code>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
