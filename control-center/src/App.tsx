import { useEffect, useMemo, useState } from 'react';
import { loadControlCenterConfig, type ControlCenterConfig } from './app/config';
import {
  CONTROL_CENTER_SECTIONS,
  type ControlCenterSectionId,
  visibleSections,
} from './app/navigation';
import { Player360Page } from './features/player360/Player360Page';
import {
  type AdminSessionState,
  displayAdminRole,
  useAdminSession,
} from './features/session/useAdminSession';
import { AdminApiClient } from './lib/api/admin-api';

const CANONICAL_PROGRESS = 9.75;

const workQueue = [
  {
    eyebrow: 'APROVAÇÕES',
    title: 'Nenhuma operação de mutation exposta',
    copy: 'Este slice é somente leitura. Aprovações entram quando o wizard de operações for conectado.',
    tone: 'quiet',
  },
  {
    eyebrow: 'LIVEOPS',
    title: 'Camada ainda não materializada',
    copy: 'Eventos, segmentos e overrides entram depois de Player 360 e Content Studio.',
    tone: 'planned',
  },
  {
    eyebrow: 'RUNTIME',
    title: 'Admin API com boundary autenticada',
    copy: 'Sessão e Player 360 usam o backend real; saúde operacional ampla continua em fase posterior.',
    tone: 'quiet',
  },
] as const;

function AvailabilityBadge({ availability }: { availability: string }) {
  if (availability === 'planned') return <span className="nav-badge">EM PROJETO</span>;
  return null;
}

function SessionGate({
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
    <div className="session-runtime-summary" aria-label="Diagnóstico operacional">
      <span>BUILD {config.buildLabel}</span>
      <span>AMBIENTE {environmentLabel(config.environment)}</span>
      <span>ADMIN API {apiState}</span>
    </div>
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

function environmentLabel(environment: 'development' | 'staging' | 'production'): string {
  if (environment === 'production') return 'PRODUÇÃO';
  if (environment === 'staging') return 'STAGING';
  return 'DESENVOLVIMENTO';
}

export function App() {
  const config = useMemo(() => loadControlCenterConfig(), []);
  const client = useMemo(() => new AdminApiClient(config.apiBaseUrl), [config.apiBaseUrl]);
  const { state: sessionState, capabilities, reload } = useAdminSession(client);
  const [activeSection, setActiveSection] = useState<ControlCenterSectionId>('today');
  const [query, setQuery] = useState('');
  const sections = useMemo(() => visibleSections(capabilities), [capabilities]);
  const active =
    CONTROL_CENTER_SECTIONS.find((section) => section.id === activeSection) ?? sections[0];

  useEffect(() => {
    if (!sections.some((section) => section.id === activeSection)) setActiveSection('today');
  }, [activeSection, sections]);

  if (sessionState.status !== 'ready') {
    return <SessionGate state={sessionState} config={config} onRetry={reload} />;
  }

  const session = sessionState.session;
  const canReadSensitive = capabilities.has('player.read_sensitive');
  const canReadPlayers = capabilities.has('player.read');
  const roleLabel = displayAdminRole(session);
  const environment = environmentLabel(session.environment);
  const principalShort = `${session.principalId.slice(0, 8)}…${session.principalId.slice(-4)}`;

  return (
    <div className="control-center">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark-core" />
          </div>
          <div>
            <span className="brand-kicker">POKÉMON RPG</span>
            <strong className="brand-name">Control Center</strong>
          </div>
        </div>

        <div className="environment-card" data-environment={session.environment}>
          <span className="environment-dot" aria-hidden="true" />
          <div>
            <span className="environment-label">AMBIENTE</span>
            <strong>{environment}</strong>
          </div>
          <span className="environment-meta">{session.environment.toUpperCase()}</span>
        </div>

        <nav className="primary-nav">
          {sections.map((section) => (
            <button
              className={`nav-item ${activeSection === section.id ? 'is-active' : ''}`}
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span className="nav-glyph" aria-hidden="true">
                {section.glyph}
              </span>
              <span className="nav-copy">
                <span className="nav-label">{section.label}</span>
                <span className="nav-description">{section.description}</span>
              </span>
              <AvailabilityBadge availability={section.availability} />
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="principal-avatar" aria-hidden="true">
            {roleLabel.slice(0, 1)}
          </div>
          <div className="principal-copy">
            <strong>{roleLabel}</strong>
            <span title={session.principalId}>{principalShort}</span>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Revalidar sessão"
            onClick={() => void reload()}
          >
            ↻
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              aria-label="Busca global"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogador, Pokémon, área, operação..."
              value={query}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <span className="foundation-pill">READ-ONLY · ADMIN API</span>
            <button className="icon-button large" type="button" aria-label="Ajuda">
              ?
            </button>
          </div>
        </header>

        <section className="content">
          <div className="page-heading">
            <div>
              <span className="section-kicker">{active?.shortLabel.toUpperCase()}</span>
              <h1>{active?.label === 'Hoje' ? 'O que precisa da sua atenção.' : active?.label}</h1>
              <p>{active?.description}</p>
            </div>
            <div className="heading-meta">
              <span>{environment}</span>
              <span className="separator">/</span>
              <span>BUILD {config.buildLabel}</span>
            </div>
          </div>

          {activeSection === 'today' ? (
            <>
              <section className="signal-grid" aria-label="Resumo operacional">
                <article className="signal-card primary-signal">
                  <div className="signal-topline">
                    <span className="signal-label">CENTRAL</span>
                    <span className="status-chip">EM CONSTRUÇÃO</span>
                  </div>
                  <strong className="signal-value">{CANONICAL_PROGRESS.toFixed(2)}%</strong>
                  <span className="signal-caption">progresso canônico</span>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Progresso canônico da Central"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={CANONICAL_PROGRESS}
                  >
                    <span style={{ width: `${CANONICAL_PROGRESS}%` }} />
                  </div>
                  <p>
                    Foundation validada e primeira boundary autenticada/read-only conectada ao
                    backend.
                  </p>
                </article>

                <article className="signal-card">
                  <div className="signal-topline">
                    <span className="signal-label">SESSÃO ADMIN</span>
                    <span className="good-dot" aria-hidden="true" />
                  </div>
                  <strong className="signal-value compact">{roleLabel}</strong>
                  <span className="signal-caption">
                    {session.capabilities.length} capabilities efetivas
                  </span>
                  <p>
                    Menus e leitura sensível derivam desta sessão; o backend revalida autorização em
                    cada request.
                  </p>
                </article>

                <article className="signal-card">
                  <div className="signal-topline">
                    <span className="signal-label">PLAYER 360</span>
                    <span className="good-dot" aria-hidden="true" />
                  </div>
                  <strong className="signal-value compact">READ-ONLY</strong>
                  <span className="signal-caption">busca + leitura individual</span>
                  <p>
                    Busca e overview podem consultar dados reais. Nenhuma mutation está exposta
                    neste slice.
                  </p>
                </article>
              </section>

              <section className="two-column-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">FILA DE TRABALHO</span>
                      <h2>Agora</h2>
                    </div>
                    <button type="button" className="text-button">
                      Ver tudo
                    </button>
                  </div>
                  <div className="queue-list">
                    {workQueue.map((item) => (
                      <article className="queue-item" key={item.eyebrow}>
                        <span className={`queue-indicator ${item.tone}`} />
                        <div>
                          <span className="queue-eyebrow">{item.eyebrow}</span>
                          <strong>{item.title}</strong>
                          <p>{item.copy}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">ATALHOS</span>
                      <h2>Trabalho frequente</h2>
                    </div>
                  </div>
                  <div className="quick-list">
                    <button
                      type="button"
                      className="quick-action"
                      disabled={!canReadPlayers}
                      onClick={() => setActiveSection('players')}
                    >
                      <span className="quick-glyph" aria-hidden="true">
                        ⌕
                      </span>
                      <span>
                        <strong>Buscar jogador</strong>
                        <small>Abrir o ponto de entrada real do Player 360.</small>
                      </span>
                      <span className="quick-lock">
                        {canReadPlayers ? 'DISPONÍVEL' : 'SEM CAPABILITY'}
                      </span>
                    </button>
                    <button type="button" className="quick-action" disabled>
                      <span className="quick-glyph" aria-hidden="true">
                        ◇
                      </span>
                      <span>
                        <strong>Revisar conteúdo</strong>
                        <small>Comparar drafts e releases antes de publicar.</small>
                      </span>
                      <span className="quick-lock">PRÓXIMA FASE</span>
                    </button>
                    <button type="button" className="quick-action" disabled>
                      <span className="quick-glyph" aria-hidden="true">
                        ↺
                      </span>
                      <span>
                        <strong>Ver auditoria</strong>
                        <small>Reconstruir ações administrativas e seus resultados.</small>
                      </span>
                      <span className="quick-lock">PRÓXIMA FASE</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel principles-panel">
                <div className="panel-heading">
                  <div>
                    <span className="panel-kicker">REGRA DE OURO</span>
                    <h2>A interface pode ser rápida sem ser imprudente.</h2>
                  </div>
                </div>
                <div className="principle-grid">
                  <div>
                    <span>01</span>
                    <strong>Contexto primeiro</strong>
                    <p>Alvo e ambiente nunca desaparecem durante uma alteração.</p>
                  </div>
                  <div>
                    <span>02</span>
                    <strong>Impacto antes do apply</strong>
                    <p>Simulation mostra o que muda antes da confirmação.</p>
                  </div>
                  <div>
                    <span>03</span>
                    <strong>Backend manda</strong>
                    <p>Capability, scope, revision e invariantes são sempre server-side.</p>
                  </div>
                  <div>
                    <span>04</span>
                    <strong>Evidência depois</strong>
                    <p>Toda operação relevante termina com resultado verificável e auditável.</p>
                  </div>
                </div>
              </section>
            </>
          ) : activeSection === 'players' ? (
            <Player360Page canReadSensitive={canReadSensitive} client={client} />
          ) : (
            <section className="placeholder-panel">
              <span className="placeholder-glyph" aria-hidden="true">
                {active?.glyph}
              </span>
              <span className="panel-kicker">FOUNDATION</span>
              <h2>{active?.label} já tem lugar na arquitetura.</h2>
              <p>{active?.description}</p>
              <div className="placeholder-note">
                Esta tela não finge dados nem ações. O próximo slice conectará somente superfícies
                sustentadas por contratos reais do backend.
              </div>
            </section>
          )}

          {query.trim() ? (
            <div className="search-preview" role="status">
              <span>BUSCA GLOBAL AINDA EM FOUNDATION</span>
              <strong>“{query.trim()}”</strong>
              <p>
                Player 360 já possui busca real; a busca global multi-entidade permanece para a Fase
                3.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
