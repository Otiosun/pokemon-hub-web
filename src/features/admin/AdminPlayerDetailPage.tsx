import { useCallback, useEffect, useState } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import { AdminPlayerAdjustments } from './AdminPlayerAdjustments';
import { AdminPokemonOperations } from './AdminPokemonOperations';
import { AdminPokemonGrantAndEffects } from './AdminPokemonGrantAndEffects';
import { AdminRepairOperations } from './AdminRepairOperations';
import { SpeciesPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import {
  getAdminPlayer,
  type AdminPlayer360,
} from '../../player-api/playerPortalAdminPlayersClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';
import './admin-player360.css';

function AccessDenied() {
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

function EmptyValue({ value }: { value: string | null | undefined }) {
  return <>{value && value.trim() ? value : '—'}</>;
}

export function AdminPlayerDetailPage({ playerId }: { playerId: string }) {
  const admin = usePlayerPortalAdmin();
  const [player, setPlayer] = useState<AdminPlayer360 | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const canReadPlayers =
    admin.status === 'admin' && admin.admin.capabilities.includes('player.read');

  const loadPlayer = useCallback(
    async (signal?: AbortSignal) => {
      setLoadState('loading');
      try {
        const result = await getAdminPlayer(playerId);
        if (signal?.aborted) return;
        if (result.status === 'not-found') {
          setPlayer(null);
          setLoadState('not-found');
          return;
        }
        if (result.status !== 'ok') {
          setPlayer(null);
          setLoadState('error');
          return;
        }
        setPlayer(result.player);
        setLoadState('ready');
      } catch {
        if (signal?.aborted) return;
        setPlayer(null);
        setLoadState('error');
      }
    },
    [playerId],
  );

  useEffect(() => {
    if (!canReadPlayers) return;
    const controller = new AbortController();
    void loadPlayer(controller.signal);
    return () => {
      controller.abort();
    };
  }, [canReadPlayers, loadPlayer]);

  if (admin.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>POKÉMON BEYOND</small><strong>PLAYER 360</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">VALIDANDO ACESSO…</section>
      </main>
    );
  }
  if (!canReadPlayers) return <AccessDenied />;

  if (loadState !== 'ready' || player === null) {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>CENTRAL ADM</small><strong>PLAYER 360</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-player-detail-status">
          <a href="/admin/players">‹ VOLTAR A JOGADORES</a>
          <strong>
            {loadState === 'loading'
              ? 'CARREGANDO FICHA…'
              : loadState === 'not-found'
                ? 'JOGADOR NÃO ENCONTRADO'
                : 'NÃO FOI POSSÍVEL ABRIR A FICHA'}
          </strong>
        </section>
      </main>
    );
  }

  const trainerName = player.profile.trainerName ?? 'Treinador sem nome';

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM · PLAYER 360</small><strong>{trainerName.toUpperCase()}</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-player-detail-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span>
          <a href="/admin/players">JOGADORES</a><span>›</span>
          <strong>{trainerName}</strong>
        </div>

        <header className="admin-player-hero">
          <div>
            <span className="admin-kicker">FICHA OPERACIONAL</span>
            <h1>{trainerName}</h1>
            <p>{player.player.id}</p>
          </div>
          <div className="admin-player-hero-status">
            <span>STATUS</span>
            <strong>{player.player.status}</strong>
            <small>rev. {player.player.revision}</small>
          </div>
        </header>

        <section className="admin-player-overview-grid">
          <article>
            <span>NÍVEL</span><strong>{player.progression.level}</strong>
            <small>{player.progression.insigniaPoints} pontos</small>
          </article>
          <article>
            <span>LOCALIZAÇÃO</span>
            <strong>{player.location ? 'REGISTRADA' : 'SEM LOCAL'}</strong>
            <small>{player.location?.areaId ?? '—'}</small>
          </article>
          <article>
            <span>POKÉDEX</span>
            <strong>{player.pokedex.speciesCaught} capturados</strong>
            <small>{player.pokedex.speciesSeen} espécies vistas</small>
          </article>
          <article>
            <span>ESTADO AO VIVO</span>
            <strong>{player.activeBattle ? 'EM BATALHA' : player.activeEncounter ? 'EM ENCONTRO' : 'LIVRE'}</strong>
            <small>{player.activeBattle?.status ?? player.activeEncounter?.status ?? 'sem fluxo ativo'}</small>
          </article>
        </section>

        <div className="admin-player-detail-grid">
          <section className="admin-player-panel">
            <header><span>PERFIL E ONBOARDING</span></header>
            <dl>
              <div><dt>Treinador</dt><dd><EmptyValue value={player.profile.trainerName} /></dd></div>
              <div><dt>Locale</dt><dd><EmptyValue value={player.profile.locale} /></dd></div>
              <div><dt>Região de origem</dt><dd><EmptyValue value={player.profile.originRegionId} /></dd></div>
              <div><dt>Onboarding</dt><dd><EmptyValue value={player.onboarding.state} /></dd></div>
              <div><dt>Concluído</dt><dd><EmptyValue value={player.onboarding.completedAt} /></dd></div>
            </dl>
          </section>

          <section className="admin-player-panel">
            <header><span>ECONOMIA</span></header>
            <div className="admin-compact-list">
              {player.wallets.length ? player.wallets.map((wallet) => (
                <div key={wallet.currencyId}>
                  <span>{wallet.displayName}</span><strong>{wallet.amount}</strong>
                </div>
              )) : <small>Nenhuma carteira registrada.</small>}
            </div>
          </section>

          <section className="admin-player-panel">
            <header><span>INVENTÁRIO</span><strong>{player.inventory.length}</strong></header>
            <div className="admin-compact-list is-scroll">
              {player.inventory.length ? player.inventory.map((item) => (
                <div key={item.itemId}>
                  <span>{item.slug}</span><strong>×{item.quantity}</strong>
                </div>
              )) : <small>Inventário vazio.</small>}
            </div>
          </section>

          <section className="admin-player-panel">
            <header><span>EFEITOS ATIVOS</span><strong>{player.effects.length}</strong></header>
            <div className="admin-tag-list">
              {player.effects.length
                ? player.effects.map((effect) => <span key={effect.id}>{effect.effectSlug}</span>)
                : <small>Nenhum efeito ativo.</small>}
            </div>
          </section>
        </div>

        <section className="admin-player-pokemon-section">
          <header>
            <div><span>POKÉMON</span><strong>{player.pokemon.length}</strong></div>
            <small>TIME, BOX E ESTADO MECÂNICO</small>
          </header>
          <div className="admin-player-pokemon-grid">
            {player.pokemon.map((pokemon) => (
              <article key={pokemon.id}>
                <div className="admin-player-pokemon-art">
                  <SpeciesPokemonImage
                    dex={pokemon.nationalDex}
                    variant={pokemon.shiny ? 'shiny' : 'regular'}
                    assetRole="official-artwork"
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="admin-player-pokemon-copy">
                  <span>#{String(pokemon.nationalDex).padStart(3, '0')}</span>
                  <strong>{pokemon.nickname ?? pokemon.speciesSlug}</strong>
                  <small>Lv. {pokemon.level} · {pokemon.shiny ? 'SHINY · ' : ''}{pokemon.status}</small>
                  <small>{pokemon.placement ? `${pokemon.placement.kind} · slot ${pokemon.placement.slotNo}` : 'sem posição'}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <AdminPokemonOperations
          key={player.pokemon.map((entry) => `${entry.id}:${entry.revision}`).join('|')}
          playerId={player.player.id}
          capabilities={admin.status === 'admin' ? admin.admin.capabilities : []}
          pokemon={player.pokemon}
          onApplied={() => {
            void loadPlayer();
          }}
        />

        <AdminPokemonGrantAndEffects
          playerId={player.player.id}
          capabilities={admin.status === 'admin' ? admin.admin.capabilities : []}
          pokemon={player.pokemon}
          effects={player.effects}
          onApplied={() => {
            void loadPlayer();
          }}
        />

        <section className="admin-player-live-grid">
          <article className="admin-player-panel">
            <header><span>ENCONTRO ATIVO</span></header>
            {player.activeEncounter ? (
              <dl>
                <div><dt>Status</dt><dd>{player.activeEncounter.status}</dd></div>
                <div><dt>Área</dt><dd>{player.activeEncounter.areaId}</dd></div>
                <div><dt>Revision</dt><dd>{player.activeEncounter.revision}</dd></div>
                <div><dt>ID</dt><dd>{player.activeEncounter.id}</dd></div>
              </dl>
            ) : <small>Nenhum encontro ativo.</small>}
          </article>
          <article className="admin-player-panel">
            <header><span>BATALHA ATIVA</span></header>
            {player.activeBattle ? (
              <dl>
                <div><dt>Status</dt><dd>{player.activeBattle.status}</dd></div>
                <div><dt>Tipo</dt><dd>{player.activeBattle.battleType}</dd></div>
                <div><dt>Turno</dt><dd>{player.activeBattle.turnNumber}</dd></div>
                <div><dt>Version</dt><dd>{player.activeBattle.version}</dd></div>
              </dl>
            ) : <small>Nenhuma batalha ativa.</small>}
          </article>
        </section>

        <AdminRepairOperations
          key={`${player.activeBattle?.id ?? 'no-battle'}:${player.activeBattle?.version ?? '0'}:${player.activeEncounter?.id ?? 'no-encounter'}:${player.activeEncounter?.revision ?? '0'}`}
          playerId={player.player.id}
          capabilities={admin.status === 'admin' ? admin.admin.capabilities : []}
          activeBattle={player.activeBattle}
          activeEncounter={player.activeEncounter}
          onApplied={() => {
            void loadPlayer();
          }}
        />

        <section className="admin-player-activity">
          <header><span>ATIVIDADE RECENTE</span><strong>{player.recentActivity.length}</strong></header>
          {player.recentActivity.length ? player.recentActivity.map((activity) => (
            <div key={`${activity.kind}:${activity.sourceId}:${activity.occurredAt}`}>
              <span>{activity.kind}</span>
              <strong>{activity.sourceType}</strong>
              <small>{new Date(activity.occurredAt).toLocaleString('pt-BR')}</small>
              <p>{activity.reason ?? activity.sourceId}</p>
            </div>
          )) : <p className="admin-muted">Nenhuma atividade recente registrada.</p>}
        </section>

        <AdminPlayerAdjustments
          playerId={player.player.id}
          capabilities={admin.status === 'admin' ? admin.admin.capabilities : []}
          inventory={player.inventory}
          wallets={player.wallets}
          onApplied={() => {
            void loadPlayer();
          }}
        />
      </section>
    </main>
  );
}
