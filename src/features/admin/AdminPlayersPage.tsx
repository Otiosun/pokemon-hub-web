import { useEffect, useState, type FormEvent } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  searchAdminPlayers,
  type AdminPlayerSearchItem,
  type AdminPlayerStatus,
} from '../../player-api/playerPortalAdminPlayersClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import './admin-page.css';
import './admin-player360.css';

const STATUSES: Array<{ value: '' | AdminPlayerStatus; label: string }> = [
  { value: '', label: 'TODOS' },
  { value: 'ACTIVE', label: 'ATIVOS' },
  { value: 'SUSPENDED', label: 'SUSPENSOS' },
  { value: 'ARCHIVED', label: 'ARQUIVADOS' },
];

function stateLabel(player: AdminPlayerSearchItem) {
  if (player.activeBattleId) return `BATALHA · ${player.activeBattleStatus ?? 'ATIVA'}`;
  if (player.activeEncounterId) return `ENCONTRO · ${player.activeEncounterStatus ?? 'ATIVO'}`;
  return 'LIVRE';
}

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

export function AdminPlayersPage() {
  const admin = usePlayerPortalAdmin();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'' | AdminPlayerStatus>('');
  const [players, setPlayers] = useState<AdminPlayerSearchItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle');

  const canReadPlayers =
    admin.status === 'admin' && admin.admin.capabilities.includes('player.read');

  const runSearch = async (append = false, cursor: string | null = null) => {
    setSearchState('loading');
    try {
      const result = await searchAdminPlayers({
        query,
        status,
        cursor,
        limit: 25,
      });
      if (result.status !== 'ok') {
        setPlayers([]);
        setNextCursor(null);
        setSearchState('error');
        return;
      }
      setPlayers((current) => (append ? [...current, ...result.players] : result.players));
      setNextCursor(result.nextCursor);
      setSearchState('idle');
    } catch {
      setSearchState('error');
    }
  };

  useEffect(() => {
    if (!canReadPlayers) return;
    void runSearch(false, null);
    // First administrative slice intentionally loads only when authorization is proven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadPlayers]);

  if (admin.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>POKÉMON BEYOND</small><strong>PLAYER 360</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">VALIDANDO ACESSO A JOGADORES…</section>
      </main>
    );
  }

  if (!canReadPlayers) return <AccessDenied />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch(false, null);
  };

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM</small><strong>JOGADORES · PLAYER 360</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-players-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>JOGADORES</strong>
        </div>

        <header className="admin-player-heading">
          <div>
            <span className="admin-kicker">SALA DO MESTRE</span>
            <h1>Jogadores</h1>
            <p>Busque uma ficha e abra o estado completo do jogador antes de qualquer intervenção.</p>
          </div>
          <div className="admin-player-heading-stat">
            <span>RESULTADOS</span>
            <strong>{players.length}</strong>
          </div>
        </header>

        <form className="admin-player-search" onSubmit={submit}>
          <label>
            <span>BUSCAR TREINADOR</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome do treinador"
              maxLength={80}
            />
          </label>
          <label>
            <span>STATUS</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as '' | AdminPlayerStatus)}
            >
              {STATUSES.map((item) => (
                <option key={item.value || 'all'} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={searchState === 'loading'}>
            {searchState === 'loading' ? 'BUSCANDO…' : 'BUSCAR'}
          </button>
        </form>

        {searchState === 'error' ? (
          <div className="admin-player-empty is-error">
            <strong>NÃO FOI POSSÍVEL CONSULTAR OS JOGADORES</strong>
            <span>Nenhuma alteração foi executada. Tente novamente.</span>
          </div>
        ) : players.length === 0 && searchState !== 'loading' ? (
          <div className="admin-player-empty">
            <strong>NENHUM JOGADOR ENCONTRADO</strong>
            <span>Ajuste a busca ou o status.</span>
          </div>
        ) : (
          <div className="admin-player-list">
            {players.map((player) => (
              <a
                className="admin-player-row"
                href={`/admin/players/${player.playerId}`}
                key={player.playerId}
              >
                <div className="admin-player-row-main">
                  <span className="admin-player-status-dot" data-status={player.status} />
                  <div>
                    <strong>{player.trainerName ?? 'Treinador sem nome'}</strong>
                    <small>{player.playerId}</small>
                  </div>
                </div>
                <div className="admin-player-row-metric">
                  <span>NÍVEL</span>
                  <strong>{player.trainerLevel}</strong>
                </div>
                <div className="admin-player-row-metric">
                  <span>PROGRESSÃO</span>
                  <strong>{player.insigniaPoints}</strong>
                </div>
                <div className="admin-player-row-state">
                  <span>{player.status}</span>
                  <strong>{stateLabel(player)}</strong>
                </div>
                <span className="admin-player-row-arrow" aria-hidden="true">›</span>
              </a>
            ))}
          </div>
        )}

        {nextCursor ? (
          <button
            className="admin-load-more"
            type="button"
            disabled={searchState === 'loading'}
            onClick={() => void runSearch(true, nextCursor)}
          >
            CARREGAR MAIS
          </button>
        ) : null}
      </section>
    </main>
  );
}
