import { useState } from 'react';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import { isPremiumDeliveryDelegate } from './premiumDeliveryAccess';
import type { PremiumStageSession } from '../../player-api/premiumStagingAuthClient';
import { currentPremiumManualUiMode } from '../../player-api/premiumManualUiMode';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { PremiumStagingSessionGate } from './PremiumStagingSessionGate';
import { AdminPremiumReadPanel } from './AdminPremiumReadPanel';
import { AdminPremiumDeliveryPanel } from './AdminPremiumDeliveryPanel';
import { AdminPremiumInventoryPanel } from './AdminPremiumInventoryPanel';
import { AdminPremiumPokemonPanel } from './AdminPremiumPokemonPanel';
import { AdminPremiumCasesPanel } from './AdminPremiumCasesPanel';
import { AdminPremiumFulfillmentCatalog } from './AdminPremiumFulfillmentCatalog';
import { AdminPremiumMasterBallPanel } from './AdminPremiumMasterBallPanel';
import { PremiumStagePlayerSearch, type SearchPlayer } from './PremiumStagePlayerSearch';
import { AdminPremiumSupportLedger } from './AdminPremiumSupportLedger';
import './admin-page.css';
import './admin-premium-support.css';
import './admin-premium-staging.css';

type Section = 'delivery' | 'cases' | 'inventory' | 'pokemon' | 'catalog' | 'entitlements' | 'support';
const PLAYER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function AdminPremiumStagingPage() {
  // Preview must never fetch the live Hub administrator session just to render
  // a staging page. Keep the two session providers in separate components.
  return currentPremiumManualUiMode() === 'local'
    ? <LocalPremiumStagingPage />
    : <PreviewPremiumStagingPage />;
}

function LocalPremiumStagingPage() {
  const admin = usePlayerPortalAdmin();
  const deliveryOnly = admin.status !== 'admin' || isPremiumDeliveryDelegate(admin.admin);
  const canSearchPlayers =
    admin.status === 'admin' &&
    (admin.admin.owner || admin.admin.capabilities.includes('player.read'));
  return <PremiumStagingPageContent local deliveryOnly={deliveryOnly} canSearchPlayers={canSearchPlayers} />;
}

function PreviewPremiumStagingPage() {
  const [session, setSession] = useState<PremiumStageSession | null>(null);
  // Until the isolated backend establishes ownership, show delivery only.
  // Non-owners never see owner-only navigation, even during loading.
  const owner = session?.status === 'ready' && session.owner === true;
  const canSearchPlayers = session?.status === 'ready' && session.canSearchPlayers === true;
  return <PremiumStagingPageContent local={false} deliveryOnly={!owner} canSearchPlayers={canSearchPlayers} onStageSessionChange={setSession} />;
}

function PremiumStagingPageContent({
  local, deliveryOnly, canSearchPlayers, onStageSessionChange,
}: {
  local: boolean;
  deliveryOnly: boolean;
  canSearchPlayers: boolean;
  onStageSessionChange?: ((session: PremiumStageSession) => void) | undefined;
}) {
  const [draft, setDraft] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchPlayer | null>(null);
  const [section, setSection] = useState<Section>('delivery');
  const [deliveryLocked, setDeliveryLocked] = useState(false);
  const valid = PLAYER_ID.test(draft.trim());

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>POKÉMON BEYOND</small><strong>CENTRAL PREMIUM</strong></div>
        <HubMenuTrigger />
      </header>

      <PremiumStagingSessionGate access="delivery" onSessionChange={onStageSessionChange}>
      <div className="admin-shell">
        <section className="admin-premium">
          <header className="admin-premium-heading">
            <div>
              <span>CENTRAL ADM · ENTREGAS MANUAIS</span>
              <h1>Entregas &amp; suporte</h1>
              <p>Gerencie benefícios disponíveis para entrega e atendimentos pendentes. Pagamentos são verificados exclusivamente pela administração.</p>
            </div>
            <strong>{local ? 'API LOCAL · ATIVAÇÃO MANUAL' : 'STAGING · NÃO LIVE'}</strong>
          </header>

          {deliveryOnly ? <p className="premium-staging-disclaimer" role="status">Seu acesso está restrito à entrega de benefícios autorizados. Outras operações Premium continuam exclusivas do proprietário.</p> : null}
          {deliveryOnly && !canSearchPlayers ? (
            <p className="premium-staging-disclaimer" role="status">A busca de jogadores também exige a permissão player.read. Peça essa permissão ao proprietário ou selecione um Player ID já verificado.</p>
          ) : null}
          <p className="premium-staging-disclaimer" role="status">
            {local
              ? 'Este painel consulta a API do próprio operador, se habilitada e autenticada pelo servidor. Entregas alteram dados reais: confira destinatário e quantidade. Não aprova pagamentos.'
              : 'Ambiente de integração em preparação. Os registros só aparecem quando uma API de staging independente e autenticada estiver habilitada. Não há pedidos ou pagamentos de demonstração.'}
          </p>

          <section className="premium-staging-player" aria-label="Selecionar destinatário Premium">
            <div className="premium-player-intro">
              <span>ETAPA 01 · DESTINATÁRIO</span>
              <h2>Para quem vamos entregar?</h2>
              <p>Encontre o treinador pelo nome e confira a conta antes de autorizar qualquer benefício.</p>
            </div>
            <PremiumStagePlayerSearch
              disabled={deliveryLocked}
              onEditing={() => { if (deliveryLocked) return; setSelectedPlayer(null); setPlayerId(null); }}
              onSelect={(player) => {
                if (deliveryLocked) return;
                setDraft(player.playerId);
                setPlayerId(player.playerId);
                setSelectedPlayer(player);
              }}
            />
            {playerId ? (
              <div className="premium-selected-player" role="status">
                <div>
                  <span>DESTINATÁRIO SELECIONADO</span>
                  <strong>{selectedPlayer?.trainerName?.trim() || (selectedPlayer ? 'Treinador sem nome' : 'ID informado manualmente')}</strong>
                  <small>{selectedPlayer
                    ? `Nível ${selectedPlayer.trainerLevel} · ${selectedPlayer.status === 'ACTIVE' ? 'Ativo' : selectedPlayer.status}`
                    : 'Confira a identidade antes de qualquer concessão.'}</small>
                  <code>{playerId}</code>
                </div>
                <button type="button" className="premium-player-change" disabled={deliveryLocked} onClick={() => {
                  setPlayerId(null);
                  setSelectedPlayer(null);
                  setDraft('');
                }}>Trocar jogador</button>
              </div>
            ) : null}
            <details className="premium-id-fallback">
              <summary>Não encontrou? Informar Player ID manualmente</summary>
              <form onSubmit={(event) => {
                event.preventDefault();
                if (valid && !deliveryLocked) {
                  setPlayerId(draft.trim());
                  setSelectedPlayer(null);
                }
              }}>
                <label htmlFor="premium-staging-player-id">ID completo do jogador (UUID)</label>
                <div>
                  <input id="premium-staging-player-id" value={draft} disabled={deliveryLocked}
                    autoComplete="off" spellCheck={false}
                    onChange={(event) => { setDraft(event.target.value); setPlayerId(null); setSelectedPlayer(null); }}
                    placeholder="00000000-0000-4000-8000-000000000000" />
                  <button type="submit" disabled={!valid || deliveryLocked}>Selecionar ID</button>
                </div>
                <small>Use somente quando tiver conferido o ID no cadastro administrativo.</small>
              </form>
            </details>
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
            ] as const).filter(([id]) => !deliveryOnly || id === 'delivery').map(([id, label, eyebrow]) => (
              <button key={id} type="button" aria-pressed={section === id}
                disabled={deliveryLocked && id !== "delivery"}
                className={section === id ? 'is-active' : undefined}
                onClick={() => setSection(id)}>
                <small>{eyebrow}</small><span>{label}</span>
              </button>
            ))}
          </nav>

          {section === 'delivery' ? (
            <AdminPremiumDeliveryPanel key={playerId ?? 'unselected'} playerId={playerId}
              onPendingIntentChange={setDeliveryLocked} />
          ) : null}
          {!deliveryOnly && section === 'cases' ? (
            <AdminPremiumCasesPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {!deliveryOnly && section === 'inventory' ? (
            <AdminPremiumInventoryPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {!deliveryOnly && section === 'pokemon' ? (
            <AdminPremiumPokemonPanel key={playerId ?? 'unselected'} playerId={playerId} />
          ) : null}
          {!deliveryOnly && section === 'catalog' ? (
            <>
              <AdminPremiumFulfillmentCatalog onOpenCases={() => setSection('cases')} />
              <AdminPremiumMasterBallPanel key={playerId ?? 'unselected'} playerId={playerId} />
            </>
          ) : null}
          {!deliveryOnly && section === 'entitlements' ? (
            <AdminPremiumReadPanel playerId={playerId} playerName={playerId} resource="entitlements" />
          ) : null}
          {!deliveryOnly && section === 'support' ? (
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
