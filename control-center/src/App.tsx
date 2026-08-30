import { useMemo, useState } from 'react';
import {
  CONTROL_CENTER_SECTIONS,
  type ControlCenterSectionId,
  visibleSections,
} from './app/navigation';

const FOUNDATION_CAPABILITIES = new Set([
  'player.read',
  'pokemon.read',
  'inventory.read',
  'economy.read',
  'progression.read',
  'pokedex.read',
  'world.read',
  'battle.read',
  'effects.read',
  'audit.read',
  'admin_operation.read',
  'content.draft.create',
  'content.draft.edit',
  'content.validate',
  'content.publish',
  'admin.role.manage',
  'admin.role.assign',
]);

const workQueue = [
  {
    eyebrow: 'APROVAÇÕES',
    title: 'Nenhuma operação aguardando review',
    copy: 'A caixa de aprovações será conectada ao Admin Registry na fase de API.',
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
    title: 'Sem telemetria administrativa conectada',
    copy: 'O shell não inventa saúde do bot. Este card só ganhará status após integração real.',
    tone: 'quiet',
  },
] as const;

const quickActions = [
  ['Buscar jogador', 'Abrir o ponto de entrada do Player 360.', '⌕'],
  ['Revisar conteúdo', 'Comparar drafts e releases antes de publicar.', '◇'],
  ['Ver auditoria', 'Reconstruir ações administrativas e seus resultados.', '↺'],
] as const;

function AvailabilityBadge({ availability }: { availability: string }) {
  if (availability === 'planned') return <span className="nav-badge">EM PROJETO</span>;
  return null;
}

export function App() {
  const [activeSection, setActiveSection] = useState<ControlCenterSectionId>('today');
  const [query, setQuery] = useState('');
  const sections = useMemo(() => visibleSections(FOUNDATION_CAPABILITIES), []);
  const active = CONTROL_CENTER_SECTIONS.find((section) => section.id === activeSection) ?? sections[0];

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

        <div className="environment-card">
          <span className="environment-dot" />
          <div>
            <span className="environment-label">AMBIENTE</span>
            <strong>Foundation</strong>
          </div>
          <span className="environment-meta">LOCAL</span>
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
          <div className="principal-avatar" aria-hidden="true">M</div>
          <div className="principal-copy">
            <strong>MASTER</strong>
            <span>Visual mock · sem sessão real</span>
          </div>
          <button className="icon-button" type="button" aria-label="Opções da conta">•••</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="search-wrap">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              aria-label="Busca global"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar jogador, Pokémon, área, operação..."
              value={query}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <span className="foundation-pill">FOUNDATION · SEM API</span>
            <button className="icon-button large" type="button" aria-label="Ajuda">?</button>
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
              <span>29 AGO 2026</span>
              <span className="separator">/</span>
              <span>CONTROL CENTER v0.1</span>
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
                  <strong className="signal-value">5,67%</strong>
                  <span className="signal-caption">progresso canônico</span>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label="Progresso canônico da Central"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={5.67}
                  >
                    <span style={{ width: '5.67%' }} />
                  </div>
                  <p>Fundação de produto fechada. App shell administrativo iniciado em branch isolada.</p>
                </article>

                <article className="signal-card">
                  <div className="signal-topline">
                    <span className="signal-label">BACKEND ADMIN</span>
                    <span className="good-dot" aria-hidden="true" />
                  </div>
                  <strong className="signal-value compact">Registry + 360</strong>
                  <span className="signal-caption">authority spine existente</span>
                  <p>A Central consumirá operações reais; nenhuma regra mecânica será duplicada aqui.</p>
                </article>

                <article className="signal-card">
                  <div className="signal-topline">
                    <span className="signal-label">PRÓXIMO GATE</span>
                    <span className="muted-dot" aria-hidden="true" />
                  </div>
                  <strong className="signal-value compact">Foundation</strong>
                  <span className="signal-caption">build · typecheck · test</span>
                  <p>Primeiro gate técnico antes de autenticação ou qualquer mutation administrativa.</p>
                </article>
              </section>

              <section className="two-column-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-kicker">FILA DE TRABALHO</span>
                      <h2>Agora</h2>
                    </div>
                    <button type="button" className="text-button">Ver tudo</button>
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
                    {quickActions.map(([title, copy, glyph]) => (
                      <button type="button" className="quick-action" key={title} disabled>
                        <span className="quick-glyph" aria-hidden="true">{glyph}</span>
                        <span>
                          <strong>{title}</strong>
                          <small>{copy}</small>
                        </span>
                        <span className="quick-lock">API PENDENTE</span>
                      </button>
                    ))}
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
                  <div><span>01</span><strong>Contexto primeiro</strong><p>Alvo e ambiente nunca desaparecem durante uma alteração.</p></div>
                  <div><span>02</span><strong>Impacto antes do apply</strong><p>Simulation mostra o que muda antes da confirmação.</p></div>
                  <div><span>03</span><strong>Backend manda</strong><p>Capability, scope, revision e invariantes são sempre server-side.</p></div>
                  <div><span>04</span><strong>Evidência depois</strong><p>Toda operação relevante termina com resultado verificável e auditável.</p></div>
                </div>
              </section>
            </>
          ) : (
            <section className="placeholder-panel">
              <span className="placeholder-glyph" aria-hidden="true">{active?.glyph}</span>
              <span className="panel-kicker">FOUNDATION</span>
              <h2>{active?.label} já tem lugar na arquitetura.</h2>
              <p>{active?.description}</p>
              <div className="placeholder-note">
                Esta tela ainda não finge dados nem ações. O próximo slice conectará somente superfícies sustentadas por contratos reais do backend.
              </div>
            </section>
          )}

          {query.trim() ? (
            <div className="search-preview" role="status">
              <span>BUSCA FOUNDATION</span>
              <strong>“{query.trim()}”</strong>
              <p>A busca visual está pronta; resultados reais entram após Admin API e autorização.</p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
