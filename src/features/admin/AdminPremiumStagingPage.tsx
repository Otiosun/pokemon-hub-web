import { useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { PremiumStagingSessionGate } from './PremiumStagingSessionGate';
import { AdminPremiumReadPanel } from './AdminPremiumReadPanel';
import { AdminPremiumDeliveryPanel } from './AdminPremiumDeliveryPanel';
import { AdminPremiumInventoryPanel } from './AdminPremiumInventoryPanel';
import { AdminPremiumPokemonPanel } from './AdminPremiumPokemonPanel';
import { AdminPremiumCasesPanel } from './AdminPremiumCasesPanel';
import { AdminPremiumFulfillmentCatalog } from './AdminPremiumFulfillmentCatalog';
import { AdminPremiumMasterBallPanel } from './AdminPremiumMasterBallPanel';
import { PremiumStagePlayerSearch } from './PremiumStagePlayerSearch';
import { AdminPremiumSupportLedger } from './AdminPremiumSupportLedger';
import './admin-page.css';
import './admin-premium-support.css';
import './admin-premium-staging.css';

type Section = 'delivery' | 'cases' | 'inventory' | 'pokemon' | 'catalog' | 'entitlements' | 'support';
const PLAYER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AdminPremiumStagingPage() {
  const [draft, setDraft] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('delivery');
  const valid = PLAYER_ID.test(draft.trim());

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>POKÉMON BEYOND</small><strong>CENTRAL PREMIUM</strong></div>
        <HubMenuTrigger />
      </header>

      <PremiumStagingSessionGate access="owner">
      <div className="admin-shell">
        <section className="admin-premium">
          <header className="admin-premium-heading">
            <div>
              <span>CENTRAL ADM · GATE E</span>
              <h1>Entregas &amp; suporte</h1>
              <p>Escolha quem recebe cada gamepass. Pagamento é verificado fora do bot e do site.</p>
            </div>
            <strong>STAGING · NÃO LIVE</strong>
          </header>

          <p className="premium-staging-disclaimer" role="status">
            Ambiente de integração em preparação. Os registros só aparecem quando uma API de staging
            independente e autenticada estiver habilitada. Não há pedidos ou pagamentos de demonstração.
          </p>

          <section className="premium-staging-player" aria-label="Identificar treinador de staging">
            <div>
              <span>IDENTIFICAÇÃO NO AMBIENTE DE TESTES</span>
              <h2>Treinador de teste</h2>
              <p>Insira apenas o Player ID de uma conta <strong>sintética de staging</strong>. Nunca utilize um ID de produção.</p>
            </div>
            <PremiumStagePlayerSearch onSelect={(id) => { setDraft(id); setPlayerId(id); }} />
            <form onSubmit={(event) => { event.preventDefault(); if (valid) setPlayerId(draft.trim()); }}>
              <label htmlFor="premium-staging-player-id">PLAYER ID (UUID)</label>
              <div>
                <input id="premium-staging-player-id" value={draft}
                  autoComplete="off" spellCheck={false}
                  onChange={(event) => { setDraft(event.target.value); setPlayerId(null); }}
                  placeholder="00000000-0000-4000-8000-000000000000" />
                <button type="submit" disabled={!valid}>CONSULTAR</button>
              </div>
            </form>
          </section>

          <nav className="admin-premium-tabs premium-staging-tabs" aria-label="Seções da Central Premium">
            {([
              ['delivery', 'ENTREGAS', 'MANUAL · PRIORIDADE'],
              ['cases', 'PENDÊNCIAS', 'PACKS & ATENDIMENTO'],
              ['inventory', 'ITENS', 'ENTREGA AVULSA'],
              ['pokemon', 'POKÉMON', 'CRIAÇÃO INDIVIDUAL'],
              ['catalog', 'GAMEPASSES', 'COBERTURA DO CATÁLOGO'],
              ['entitlements', 'BENEFÍCIOS', 'EXPIRAÇÃO & ESTADO'],
              ['support', 'ATENDIMENTOS', 'REGISTROS AUDITÁVEIS'],
            ] as const).map(([id, label, eyebrow]) => (
              <button key={id} type="button" aria-pressed={section === id}
                className={section === id ? 'is-active' : undefined}
                onClick={() => setSection(id)}>
                <small>{eyebrow}</small><span>{label}</span>
              </button>
            ))}
          </nav>

          {section === 'delivery' ? (
            <AdminPremiumDeliveryPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {section === 'cases' ? (
            <AdminPremiumCasesPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {section === 'inventory' ? (
            <AdminPremiumInventoryPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {section === 'pokemon' ? (
            <AdminPremiumPokemonPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {section === 'catalog' ? (
            <>
              <AdminPremiumFulfillmentCatalog />
              <AdminPremiumMasterBallPanel key={playerId ?? 'unselected'} playerId={playerId} />
            </>
          ) : null}
          {section === 'entitlements' ? (
            <AdminPremiumReadPanel playerId={playerId} playerName={playerId} resource="entitlements" />
          ) : null}
          {section === 'support' ? (
            <AdminPremiumSupportLedger playerId={playerId} playerName={playerId} />
          ) : null}
          <footer className="premium-staging-foot">
            <a href="/admin">← VOLTAR À CENTRAL ADM</a>
            <span>Somente o ADM concede e registra benefícios. Nenhum pagamento é confirmado aqui.</span>
          </footer>
        </section>
      </div>
      </PremiumStagingSessionGate>
    </main>
  );
}
