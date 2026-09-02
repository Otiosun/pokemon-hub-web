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
import { AdminApiClient } from './lib/api/admin-api-f83';

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

const CANONICAL_PROGRESS = 49.2;

export function App() {
  const config = useMemo(() => loadControlCenterConfig(), []);
  const client = useMemo(() => new AdminApiClient(config.apiBaseUrl), [config.apiBaseUrl]);
  const { state: sessionState, capabilities, reload } = useAdminSession(client);
  const [activeSection, setActiveSection] = useState<ControlCenterSectionId>('today');
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
  const canReadEconomy = capabilities.has('economy.read');
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
              canReadEconomy={canReadEconomy}
              canReadPlayers={canReadPlayers}
              client={client}
              principalId={session.principalId}
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
  canReadEconomy,
  canReadPlayers,
  client,
  principalId,
  roleLabel,
  session,
}: {
  canReadAudit: boolean;
  canReadEconomy: boolean;
  canReadPlayers: boolean;
  client: AdminApiClient;
  principalId: string;
  roleLabel: string;
  session: {
    readonly environment: 'development' | 'staging' | 'production';
  };
}) {
  const [activity, setActivity] = useState<
    Awaited<ReturnType<AdminApiClient['getPlayerActivityAnalytics']>> | false | null
  >(null);
  const [economy, setEconomy] = useState<
    Awaited<ReturnType<AdminApiClient['getEconomyAnalytics']>> | false | null
  >(null);
  const refreshActivity = async () => {
    try {
      setActivity(await client.getPlayerActivityAnalytics());
    } catch {
      setActivity(false);
    }
  };
  const refreshEconomy = async () => {
    try {
      setEconomy(await client.getEconomyAnalytics());
    } catch {
      setEconomy(false);
    }
  };

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

      <section className="dashboard-grid">
        <div className="panel work-panel">
          <div className="panel-heading">
            <div>
              <h2>Atividade de jogadores</h2>
            </div>
            <button
              className="secondary-button"
              disabled={!canReadPlayers}
              onClick={() => void refreshActivity()}
              type="button"
            >
              Atualizar
            </button>
          </div>
          {activity ? (
            <dl className="foundation-list">
              {[
                ['Ativos 24h', activity.activePlayers.last24Hours],
                ['Ativos 7d', activity.activePlayers.last7Days],
                ['Ativos 30d', activity.activePlayers.last30Days],
                ['Retornaram em 7d', activity.returningPlayers7Days],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="runtime-health-empty">
              {activity === false
                ? 'Consulta indisponível.'
                : canReadPlayers
                  ? 'Ainda não consultado.'
                  : 'Sem permissão player.read.'}
            </p>
          )}
        </div>

        <aside className="panel foundation-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">F8.3 · 30 DIAS</span>
              <h2>Economia agregada</h2>
            </div>
            <button
              className="secondary-button"
              disabled={!canReadEconomy}
              onClick={() => void refreshEconomy()}
              type="button"
            >
              Atualizar
            </button>
          </div>
          {economy ? (
            <>
              <dl className="foundation-list">
                {economy.currencies.map((currency) => (
                  <div key={currency.slug}>
                    <dt>{currency.displayName}</dt>
                    <dd>
                      Entradas {currency.inflow} · Saídas {currency.outflow} · Fluxo líquido{' '}
                      {currency.netFlow} · Saldo agregado {currency.totalBalance}
                    </dd>
                  </div>
                ))}
                <div>
                  <dt>Volume de inventário</dt>
                  <dd>
                    Entradas {economy.inventory.inflowUnits} · Saídas{' '}
                    {economy.inventory.outflowUnits} · Fluxo líquido{' '}
                    {economy.inventory.netFlowUnits} · {economy.inventory.totalUnitsHeld} unidades
                    mantidas
                  </dd>
                </div>
                <div>
                  <dt>Anomalias de projeção</dt>
                  <dd>
                    Carteiras {economy.anomalies.walletProjectionMismatches} · Inventários{' '}
                    {economy.anomalies.inventoryProjectionMismatches}
                  </dd>
                </div>
              </dl>
              {economy.currenciesTruncated ? (
                <p className="runtime-health-empty">
                  Exibição limitada às moedas agregadas permitidas.
                </p>
              ) : null}
            </>
          ) : (
            <p className="runtime-health-empty">
              {economy === false
                ? 'Consulta indisponível.'
                : canReadEconomy
                  ? 'Ainda não consultado.'
                  : 'Sem permissão economy.read.'}
            </p>
          )}
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
