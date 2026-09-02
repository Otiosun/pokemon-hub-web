import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { loadControlCenterConfig } from './app/config';
import {
  CONTROL_CENTER_SECTIONS,
  type ControlCenterSectionId,
  visibleSections,
} from './app/navigation';
import { ControlCenterSidebar } from './components/shell/ControlCenterSidebar';
import { OperationalDiagnostics } from './components/shell/OperationalDiagnostics';
import { SessionGate } from './components/shell/SessionGate';
import { SessionProfilePanel } from './components/shell/SessionProfilePanel';
import { AdminOperationAuditCard } from './features/audit/AdminOperationAuditCard';
import { IncidentCenterCard } from './features/incidents/IncidentCenterCard';
import { MessagingOperationsCard } from './features/runtime/MessagingOperationsCard';
import { RuntimeWhatsappHealthCard } from './features/runtime/RuntimeWhatsappHealthCard';
import { displayAdminRole, useAdminSession } from './features/session/useAdminSession';
import { AdminApiClient } from './lib/api/admin-api';

const Player360Page = lazy(() =>
  import('./features/player360/Player360Page').then((module) => ({
    default: module.Player360Page,
  })),
);

const ContentLibraryPage = lazy(() =>
  import('./features/content-studio/ContentLibraryPage').then((module) => ({
    default: module.ContentLibraryPage,
  })),
);

const CANONICAL_PROGRESS = 48.5;

const workQueue = [
  {
    eyebrow: 'OPERAÇÕES',
    title: 'Preparação auditável disponível',
    copy: 'A Central já pode preparar AdminOperations. Simular, confirmar, aprovar e aplicar continuam bloqueados no HTTP até o wizard seguro.',
    tone: 'planned',
  },
  {
    eyebrow: 'LIVEOPS',
    title: 'Camada ainda não materializada',
    copy: 'Eventos, segmentos e overrides entram depois de Player 360 e Content Studio.',
    tone: 'planned',
  },
  {
    eyebrow: 'RUNTIME',
    title: 'Evidência operacional consultável',
    copy: 'O estado registrado do runtime WhatsApp pode ser consultado manualmente, sem expor controles de lifecycle.',
    tone: 'quiet',
  },
] as const;

export function App() {
  const config = useMemo(() => loadControlCenterConfig(), []);
  const client = useMemo(() => new AdminApiClient(config.apiBaseUrl), [config.apiBaseUrl]);
  const { state: sessionState, capabilities, reload } = useAdminSession(client);
  const [activeSection, setActiveSection] = useState<ControlCenterSectionId>('today');
  const [query, setQuery] = useState('');
  const [sessionProfileOpen, setSessionProfileOpen] = useState(false);
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
  const canReadAudit = capabilities.has('audit.read');
  const roleLabel = displayAdminRole(session);
  const apiState = 'CONECTADA · SESSÃO VALIDADA' as const;

  return (
    <div className="control-center">
      <ControlCenterSidebar
        activeSection={activeSection}
        environment={session.environment}
        onOpenSession={() => setSessionProfileOpen(true)}
        onReload={reload}
        onSelect={setActiveSection}
        principalId={session.principalId}
        roleLabel={roleLabel}
        sections={sections}
      />

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <span className="context-kicker">{active?.label ?? 'CONTROL CENTER'}</span>
            <strong>{active?.description ?? 'Superfície administrativa autenticada'}</strong>
          </div>

          <div className="topbar-actions">
            <div className="global-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Busca global"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar jogador, operação ou área"
                value={query}
              />
              <kbd>⌘ K</kbd>
            </div>
            <button
              className="session-profile-mobile"
              type="button"
              onClick={() => setSessionProfileOpen(true)}
            >
              Minha sessão
            </button>
            <button className="secondary-button" type="button" onClick={() => void reload()}>
              Revalidar sessão
            </button>
          </div>
        </header>

        <div className="workspace-scroll">
          {sessionProfileOpen ? (
            <SessionProfilePanel
              onClose={() => setSessionProfileOpen(false)}
              onReload={reload}
              roleLabel={roleLabel}
              session={session}
            />
          ) : null}

          <section className="page-heading">
            <div>
              <span className="eyebrow">CENTRAL ADMINISTRATIVA</span>
              <h1>{active?.label ?? 'Control Center'}</h1>
              <p>{active?.description ?? 'Operação administrativa autenticada.'}</p>
            </div>
            <div className="heading-actions">
              <OperationalDiagnostics
                buildLabel={config.buildLabel}
                environment={session.environment}
                apiState={apiState}
                inline
              />
              <span className="status-pill">READ + PREPARE · ADMIN API</span>
            </div>
          </section>

          {activeSection === 'today' ? (
            <TodayView
              canReadAudit={canReadAudit}
              canReadPlayers={canReadPlayers}
              client={client}
              onOpenPlayers={() => setActiveSection('players')}
              principalId={session.principalId}
              query={query}
              roleLabel={roleLabel}
              session={session}
            />
          ) : activeSection === 'players' ? (
            <Suspense
              fallback={
                <section className="foundation-placeholder" role="status">
                  <span className="eyebrow">PLAYER 360</span>
                  <h2>Carregando workspace de jogadores…</h2>
                  <p>
                    O shell administrativo continua disponível enquanto este módulo é carregado.
                  </p>
                </section>
              }
            >
              <Player360Page
                canReadSensitive={canReadSensitive}
                capabilities={capabilities}
                client={client}
                key={session.principalId}
              />
            </Suspense>
          ) : activeSection === 'game' ? (
            <Suspense
              fallback={
                <section className="foundation-placeholder" role="status">
                  <span className="eyebrow">CONTENT STUDIO</span>
                  <h2>Carregando biblioteca de conteúdo…</h2>
                  <p>O shell continua disponível enquanto o catálogo autorizado é carregado.</p>
                </section>
              }
            >
              <ContentLibraryPage client={client} key={session.principalId} />
            </Suspense>
          ) : (
            <FoundationView sectionId={activeSection} />
          )}
        </div>
      </main>
    </div>
  );
}

function TodayView({
  canReadAudit,
  canReadPlayers,
  client,
  onOpenPlayers,
  principalId,
  query,
  roleLabel,
  session,
}: {
  canReadAudit: boolean;
  canReadPlayers: boolean;
  client: AdminApiClient;
  onOpenPlayers: () => void;
  principalId: string;
  query: string;
  roleLabel: string;
  session: {
    readonly environment: 'development' | 'staging' | 'production';
  };
}) {
  return (
    <>
      <section className="metric-grid" aria-label="Resumo da fundação">
        <article className="metric-card is-primary">
          <span>PROGRESSO CANÔNICO</span>
          <strong>{CANONICAL_PROGRESS.toFixed(2)}%</strong>
          <small>Checklist oficial do Control Center</small>
        </article>
        <article className="metric-card">
          <span>PRINCIPAL</span>
          <strong>{roleLabel}</strong>
          <small title={principalId}>{principalId}</small>
        </article>
        <article className="metric-card">
          <span>PLAYER 360</span>
          <strong>{canReadPlayers ? 'READ' : 'BLOQUEADO'}</strong>
          <small>Permissão efetiva: player.read</small>
        </article>
      </section>

      {query ? (
        <section className="search-foundation-card">
          <div>
            <span className="eyebrow">BUSCA GLOBAL · FOUNDATION</span>
            <h2>“{query}”</h2>
            <p>
              A busca global continua apenas como fundação. Para localizar um jogador agora, use a
              busca tipada do Player 360.
            </p>
          </div>
          <button
            className="primary-button"
            disabled={!canReadPlayers}
            onClick={onOpenPlayers}
            type="button"
          >
            Buscar jogador
          </button>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <div className="panel work-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AGORA</span>
              <h2>Fila de trabalho</h2>
            </div>
            <span className="panel-meta">PREPARE-ONLY</span>
          </div>
          <div className="work-list">
            {workQueue.map((item) => (
              <article className={`work-item is-${item.tone}`} key={item.title}>
                <span className="work-eyebrow">{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel foundation-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FUNDAÇÃO</span>
              <h2>Estado operacional</h2>
            </div>
          </div>
          <dl className="foundation-list">
            <div>
              <dt>Sessão</dt>
              <dd>Backend-authoritative</dd>
            </div>
            <div>
              <dt>Capabilities</dt>
              <dd>Efetivas</dd>
            </div>
            <div>
              <dt>Player 360</dt>
              <dd>Read-only conectado</dd>
            </div>
            <div>
              <dt>Mutations</dt>
              <dd>Prepare-only</dd>
            </div>
          </dl>
          <RuntimeWhatsappHealthCard client={client} expectedEnvironment={session.environment} />
          <MessagingOperationsCard client={client} />
          <IncidentCenterCard client={client} />
          {canReadAudit ? <AdminOperationAuditCard client={client} /> : null}
        </aside>
      </section>
    </>
  );
}

function FoundationView({ sectionId }: { sectionId: ControlCenterSectionId }) {
  const section = CONTROL_CENTER_SECTIONS.find((candidate) => candidate.id === sectionId);

  return (
    <section className="foundation-placeholder">
      <span className="eyebrow">FOUNDATION</span>
      <h2>{section?.label ?? 'Área administrativa'}</h2>
      <p>
        {section?.description ?? 'Área planejada.'} Nenhuma operação adicional desta área é exposta
        neste slice.
      </p>
      <div className="placeholder-rule" />
      <small>
        Conectaremos esta área apenas quando contrato, authority e testes do backend existirem.
      </small>
    </section>
  );
}
