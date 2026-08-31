import { useState } from 'react';
import type { Player360Overview } from '../../lib/api/admin-api';
import { InventoryEconomyPanel } from './InventoryEconomyPanel';
import { PLAYER360_TABS, type Player360TabId } from './model';
import { PokedexPanel } from './PokedexPanel';
import { PokemonRosterPanel } from './PokemonRosterPanel';
import { ProfileProgressionPanel } from './ProfileProgressionPanel';

const MATERIALIZED_TABS = new Set<Player360TabId>([
  'overview',
  'pokemon',
  'inventory',
  'progression',
  'pokedex',
]);

function valueOrDash(value: string | null): string {
  return value === null || value.length === 0 ? '—' : value;
}

function OverviewDetails({ player }: { readonly player: Player360Overview }) {
  return (
    <section className="player360-overview-details" aria-labelledby="player360-overview-title">
      <div className="detail-surface-heading">
        <div>
          <span className="panel-kicker">VISÃO GERAL</span>
          <h3 id="player360-overview-title">Contexto antes de qualquer ação.</h3>
          <p>Resumo read-only da pessoa selecionada, relido do backend ao abrir a ficha.</p>
        </div>
        <span className="muted-badge">REV {player.playerRevision}</span>
      </div>

      <div className="overview-detail-grid">
        <article>
          <span>PERFIL</span>
          <strong>{valueOrDash(player.profile.trainerName)}</strong>
          <small>{valueOrDash(player.profile.locale)}</small>
        </article>
        <article>
          <span>ONBOARDING</span>
          <strong>{valueOrDash(player.onboarding.state)}</strong>
          <small>{player.onboarding.completedAt ? 'Concluído' : 'Pendente'}</small>
        </article>
        <article>
          <span>PROGRESSÃO</span>
          <strong>Nível {player.progression.level}</strong>
          <small>{player.progression.insigniaPoints} pontos de Insígnia</small>
        </article>
        <article>
          <span>LOCALIZAÇÃO</span>
          <strong>{valueOrDash(player.location.areaId)}</strong>
          <small>
            {player.location.enteredAt ? 'Entrada registrada' : 'Sem localização ativa'}
          </small>
        </article>
        <article>
          <span>POKÉDEX</span>
          <strong>{player.pokedex.speciesCaught} capturados</strong>
          <small>{player.pokedex.speciesSeen} vistos</small>
        </article>
        <article>
          <span>ATIVIDADE AO VIVO</span>
          <strong>{player.activeBattle ? 'Combate ativo' : 'Sem combate ativo'}</strong>
          <small>{player.activeEncounter ? 'Encounter ativo' : 'Sem encounter ativo'}</small>
        </article>
      </div>
    </section>
  );
}

export function Player360DetailTabs({ player }: { readonly player: Player360Overview }) {
  const [activeTab, setActiveTab] = useState<Player360TabId>('overview');

  return (
    <div className="player360-detail-surface">
      <div className="player360-detail-heading">
        <div>
          <span className="panel-kicker">PLAYER 360</span>
          <h3>Uma ficha, contexto progressivo.</h3>
        </div>
        <span className="muted-badge">5/8 MATERIALIZADAS</span>
      </div>

      <div className="player360-tab-strip" role="tablist" aria-label="Áreas do Player 360">
        {PLAYER360_TABS.map((tab) => {
          const materialized = MATERIALIZED_TABS.has(tab.id);
          const selected = activeTab === tab.id;
          return (
            <button
              aria-selected={selected}
              className={`player360-tab-button ${selected ? 'is-active' : ''}`}
              disabled={!materialized}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              title={materialized ? tab.label : `${tab.label}: ainda não materializada`}
              type="button"
            >
              <span>{tab.label}</span>
              <small>{materialized ? 'REAL' : 'PENDENTE'}</small>
            </button>
          );
        })}
      </div>

      <div className="player360-tab-panel" role="tabpanel">
        {activeTab === 'pokemon' ? (
          <PokemonRosterPanel player={player} />
        ) : activeTab === 'inventory' ? (
          <InventoryEconomyPanel player={player} />
        ) : activeTab === 'progression' ? (
          <ProfileProgressionPanel player={player} />
        ) : activeTab === 'pokedex' ? (
          <PokedexPanel player={player} />
        ) : (
          <OverviewDetails player={player} />
        )}
      </div>
    </div>
  );
}
