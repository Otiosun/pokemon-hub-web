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
const MODULE_LOADING = (
  <section className="foundation-placeholder" role="status">
    Carregando…
  </section>
);

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
  const canReadEconomy = capabilities.has('economy.read');
  const canReadAudit = capabilities.has('audit.read');
  const roleLabel = displayAdminRole(session);

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
          <div className="topbar-actions">
            <div className="global-search">
              <input
                aria-label="Busca global"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar jogador, operação ou área"
                value={query}
              />
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
            <h1>{active?.label ?? 'Control Center'}</h1>
            <div className="heading-actions">
              <OperationalDiagnostics
                buildLabel={config.buildLabel}
                environment={session.environment}
                apiState="CONECTADA · SESSÃO VALIDADA"
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
              onOpenPlayers={() => setActiveSection('players')}
              query={query}
              roleLabel={roleLabel}
              session={session}
            />
          ) : activeSection === 'players' ? (
            <Suspense fallback={MODULE_LOADING}>
              <Player360Page
                canReadSensitive={canReadSensitive}
                capabilities={capabilities}
                client={client}
                key={session.principalId}
              />
            </Suspense>
          ) : activeSection === 'game' ? (
            <Suspense fallback={MODULE_LOADING}>
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
  onOpenPlayers,
  query,
  roleLabel,
  session,
}: {
  canReadAudit: boolean;
  canReadEconomy: boolean;
  canReadPlayers: boolean;
  client: AdminApiClient;
  onOpenPlayers: () => void;
  query: string;
  roleLabel: string;
  session: { readonly environment: 'development' | 'staging' | 'production' };
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
          <small>
            PRINCIPAL · {roleLabel} · PLAYER 360 · {canReadPlayers ? 'READ' : 'BLOQUEADO'}
          </small>
        </article>
      </section>
      {query ? (
        <button
          className="search-foundation-card"
          disabled={!canReadPlayers}
          onClick={onOpenPlayers}
          type="button"
        >
          BUSCA GLOBAL · FOUNDATION — Para localizar um jogador agora, use a Player 360.
        </button>
      ) : null}
      <section className="dashboard-grid">
        <div className="panel work-panel">
          <div className="panel-heading">
            <h2>Atividade de jogadores</h2>
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
            <h2>Economia agregada</h2>
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
            <div className="foundation-list">
              {economy.currencies.map((currency) => (
                <p key={currency.slug}>
                  <strong>{currency.displayName}</strong>: Entradas {currency.inflow} · Saídas{' '}
                  {currency.outflow} · Fluxo líquido {currency.netFlow} · Saldo agregado{' '}
                  {currency.totalBalance}
                </p>
              ))}
              <p>
                <strong>Volume de inventário</strong>: Entradas {economy.inventory.inflowUnits} ·
                Saídas {economy.inventory.outflowUnits} · Fluxo líquido{' '}
                {economy.inventory.netFlowUnits} · {economy.inventory.totalUnitsHeld} unidades
                mantidas
              </p>
              <p>
                <strong>Anomalias de projeção</strong>: Carteiras{' '}
                {economy.anomalies.walletProjectionMismatches} · Inventários{' '}
                {economy.anomalies.inventoryProjectionMismatches}
              </p>
              {economy.currenciesTruncated ? (
                <small>Exibição limitada às moedas agregadas permitidas.</small>
              ) : null}
            </div>
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
      <h2>{section?.label ?? 'Área administrativa'}</h2>
      <p>{section?.description ?? 'Área planejada.'}</p>
    </section>
  );
}
