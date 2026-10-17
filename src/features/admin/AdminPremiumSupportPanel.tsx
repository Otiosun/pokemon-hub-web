import { useMemo, useState } from 'react';
import {
  getAdminPlayer,
  searchAdminPlayers,
  type AdminPlayer360,
  type AdminPlayerSearchItem,
} from '../../player-api/playerPortalAdminPlayersClient';
import { AdminPremiumIdentityPanel } from './AdminPremiumIdentityPanel';
import {
  classifyAdminPremiumSearch,
  maskedWhatsAppDigits,
  type AdminPremiumSearchQuery,
} from './adminPremiumSearch';
import './admin-premium-support.css';

type PremiumSection =
  | 'overview'
  | 'entitlements'
  | 'orders'
  | 'identity'
  | 'repair'
  | 'audit';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: AdminPremiumSearchQuery }
  | { status: 'results'; query: AdminPremiumSearchQuery; players: AdminPlayerSearchItem[] }
  | { status: 'selected'; query: AdminPremiumSearchQuery; player: AdminPlayer360 }
  | { status: 'empty'; query: AdminPremiumSearchQuery }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

const SECTIONS: readonly {
  id: PremiumSection;
  label: string;
  eyebrow: string;
}[] = [
  { id: 'overview', label: 'RESUMO', eyebrow: 'BUSCA & ESTADO' },
  { id: 'entitlements', label: 'ENTITLEMENTS', eyebrow: 'BENEFÍCIOS' },
  { id: 'orders', label: 'PEDIDOS', eyebrow: 'COMÉRCIO' },
  { id: 'identity', label: 'TROCA DE NÚMERO', eyebrow: 'IDENTIDADE' },
  { id: 'repair', label: 'REPROCESSAR', eyebrow: 'SUPORTE' },
  { id: 'audit', label: 'LOGS', eyebrow: 'AUDITORIA' },
] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
}

function maskedIdentity(identity: AdminPlayer360['identities'][number]): string {
  if (identity.externalId === null) return 'OCULTA PELO BACKEND';
  if (identity.provider !== 'baileys') return identity.externalId;
  const digits = identity.externalId.split('@', 1)[0] ?? '';
  return maskedWhatsAppDigits(digits);
}

function PlayerSummary({ player }: { player: AdminPlayer360 }) {
  const activeIdentity = player.identities.find((identity) => identity.status === 'ACTIVE');
  const activeEffects = player.effects.length;

  return (
    <section className="premium-player-summary" aria-label="Resumo do jogador selecionado">
      <header>
        <div>
          <small>JOGADOR SELECIONADO</small>
          <h3>{player.profile.trainerName ?? 'TREINADOR SEM NOME'}</h3>
          <code>{player.player.id}</code>
        </div>
        <span className={`premium-player-status is-${player.player.status.toLowerCase()}`}>
          {player.player.status}
        </span>
      </header>

      <div className="premium-player-metrics">
        <article>
          <span>NÍVEL</span>
          <strong>{player.progression.level}</strong>
        </article>
        <article>
          <span>POKÉMON</span>
          <strong>{player.pokemon.length}</strong>
        </article>
        <article>
          <span>ITENS</span>
          <strong>{player.inventory.length}</strong>
        </article>
        <article>
          <span>EFEITOS</span>
          <strong>{activeEffects}</strong>
        </article>
      </div>

      <dl className="premium-player-facts">
        <div>
          <dt>Região</dt>
          <dd>{player.profile.originRegionId ?? '—'}</dd>
        </div>
        <div>
          <dt>Área atual</dt>
          <dd>{player.location?.areaId ?? '—'}</dd>
        </div>
        <div>
          <dt>WhatsApp</dt>
          <dd>{activeIdentity ? `${activeIdentity.provider} · ${maskedIdentity(activeIdentity)}` : '—'}</dd>
        </div>
        <div>
          <dt>Conta criada</dt>
          <dd>{formatDate(player.player.createdAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

function PendingDomain({
  title,
  detail,
  gate,
}: {
  title: string;
  detail: string;
  gate: string;
}) {
  return (
    <section className="premium-domain-pending">
      <span>{gate}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      <strong>NÃO PROVISIONADO AINDA</strong>
    </section>
  );
}

export function AdminPremiumSupportPanel() {
  const [activeSection, setActiveSection] = useState<PremiumSection>('overview');
  const [queryText, setQueryText] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ status: 'idle' });

  const selectedPlayer = searchState.status === 'selected' ? searchState.player : null;
  const queryKind = useMemo(() => classifyAdminPremiumSearch(queryText), [queryText]);

  const selectPlayer = async (playerId: string, query: AdminPremiumSearchQuery) => {
    setSearchState({ status: 'loading', query });
    try {
      const result = await getAdminPlayer(playerId);
      if (result.status === 'ok') {
        setSearchState({ status: 'selected', query, player: result.player });
        return;
      }
      if (result.status === 'forbidden' || result.status === 'unauthenticated') {
        setSearchState({ status: 'forbidden' });
        return;
      }
      setSearchState({ status: 'empty', query });
    } catch (error) {
      setSearchState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha ao abrir jogador.',
      });
    }
  };

  const refreshSelectedPlayer = async () => {
    if (searchState.status !== 'selected') return;
    const current = searchState;
    const result = await getAdminPlayer(current.player.player.id);
    if (result.status === 'ok') {
      setSearchState({ status: 'selected', query: current.query, player: result.player });
      return;
    }
    if (result.status === 'forbidden' || result.status === 'unauthenticated') {
      setSearchState({ status: 'forbidden' });
      return;
    }
    setSearchState({ status: 'empty', query: current.query });
  };

  const runSearch = async () => {
    const query = classifyAdminPremiumSearch(queryText);
    if (query.kind === 'empty') {
      setSearchState({ status: 'idle' });
      return;
    }

    if (query.kind === 'uuid') {
      await selectPlayer(query.playerId, query);
      return;
    }

    const backendQuery = query.kind === 'whatsapp' ? query.externalId : query.trainerNamePrefix;
    setSearchState({ status: 'loading', query });
    try {
      const result = await searchAdminPlayers({ query: backendQuery, limit: 20 });
      if (result.status !== 'ok') {
        setSearchState({ status: 'forbidden' });
        return;
      }
      if (result.players.length === 0) {
        setSearchState({ status: 'empty', query });
        return;
      }
      if (result.players.length === 1 && result.players[0]) {
        await selectPlayer(result.players[0].playerId, query);
        return;
      }
      setSearchState({ status: 'results', query, players: result.players });
    } catch (error) {
      setSearchState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha na busca administrativa.',
      });
    }
  };

  return (
    <section className="admin-premium" id="premium" aria-labelledby="premium-support-title">
      <header className="admin-premium-heading">
        <div>
          <span>OWNER · ACESSO RESTRITO</span>
          <h2 id="premium-support-title">Premium & Suporte</h2>
          <p>
            Centro de diagnóstico e operação comercial do jogador. Leituras sensíveis e mudanças de
            identidade permanecem protegidas por autorização e auditoria do backend.
          </p>
        </div>
        <strong>SUPER-ADMIN</strong>
      </header>

      <nav className="admin-premium-tabs" aria-label="Áreas de Premium e Suporte">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'is-active' : undefined}
            onClick={() => setActiveSection(section.id)}
          >
            <small>{section.eyebrow}</small>
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      {activeSection === 'overview' ? (
        <div className="admin-premium-overview">
          <section className="premium-search-console">
            <header>
              <div>
                <span>BUSCA UNIFICADA</span>
                <strong>Nome · Player ID · WhatsApp</strong>
              </div>
              <small>{queryKind.kind === 'empty' ? 'AGUARDANDO' : queryKind.kind.toUpperCase()}</small>
            </header>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <input
                value={queryText}
                onChange={(event) => setQueryText(event.currentTarget.value)}
                placeholder="Nome, UUID ou +55 79 99999-9999"
                autoComplete="off"
                spellCheck={false}
                aria-label="Buscar jogador por nome, Player ID ou WhatsApp"
              />
              <button type="submit" disabled={searchState.status === 'loading'}>
                {searchState.status === 'loading' ? 'BUSCANDO…' : 'BUSCAR'}
              </button>
            </form>

            {searchState.status === 'idle' ? (
              <p className="premium-search-hint">
                Nome, UUID e WhatsApp consultam o Player360 atual. Números são normalizados para a
                identidade Baileys canônica e exigem a permissão sensível do backend.
              </p>
            ) : null}

            {searchState.status === 'empty' ? (
              <div className="premium-search-notice">
                <strong>NENHUM JOGADOR ENCONTRADO</strong>
                <p>Confira o identificador e tente novamente.</p>
              </div>
            ) : null}

            {searchState.status === 'forbidden' ? (
              <div className="premium-search-notice is-danger">
                <strong>ACESSO NEGADO PELO BACKEND</strong>
                <p>A sessão não possui a leitura administrativa necessária.</p>
              </div>
            ) : null}

            {searchState.status === 'error' ? (
              <div className="premium-search-notice is-danger">
                <strong>FALHA DE CONSULTA</strong>
                <p>{searchState.message}</p>
              </div>
            ) : null}

            {searchState.status === 'results' ? (
              <div className="premium-search-results">
                <header>
                  <span>RESULTADOS</span>
                  <strong>{searchState.players.length}</strong>
                </header>
                {searchState.players.map((player) => (
                  <button
                    type="button"
                    key={player.playerId}
                    onClick={() => void selectPlayer(player.playerId, searchState.query)}
                  >
                    <span>
                      <strong>{player.trainerName ?? 'Treinador sem nome'}</strong>
                      <small>{player.playerId}</small>
                    </span>
                    <span>
                      NV. {player.trainerLevel} · {player.status}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {selectedPlayer ? (
            <PlayerSummary player={selectedPlayer} />
          ) : (
            <section className="premium-player-empty">
              <span>PLAYER 360</span>
              <strong>NENHUM JOGADOR SELECIONADO</strong>
              <p>Localize um treinador para abrir o estado operacional consolidado.</p>
            </section>
          )}

          <div className="premium-overview-gates">
            <article>
              <span>ENTITLEMENTS</span>
              <strong>SCHEMA PENDENTE</strong>
              <small>Gate 5 · bloqueado por backup de produção</small>
            </article>
            <article>
              <span>PEDIDOS</span>
              <strong>PERSISTÊNCIA PENDENTE</strong>
              <small>Gate 6 · carrinho do navegador não é autoridade</small>
            </article>
            <article>
              <span>IDENTIDADE</span>
              <strong>OPERAÇÃO PROTEGIDA</strong>
              <small>Gate 4 · owner + revision + transação + auditoria</small>
            </article>
          </div>
        </div>
      ) : null}

      {activeSection === 'entitlements' ? (
        <PendingDomain
          gate="GATE 5"
          title="Entitlements canônicos"
          detail="Benefícios permanentes, temporários e consumíveis serão lidos de uma fonte própria. Não vamos inferir premium pelo histórico de pedidos."
        />
      ) : null}

      {activeSection === 'orders' ? (
        <PendingDomain
          gate="GATE 6"
          title="Pedidos e fulfillment"
          detail="O carrinho atual organiza intenção de compra. Pedidos confirmados só existirão quando o servidor persistir snapshots, estados e grants idempotentes."
        />
      ) : null}

      {activeSection === 'identity' ? (
        <AdminPremiumIdentityPanel player={selectedPlayer} onChanged={refreshSelectedPlayer} />
      ) : null}

      {activeSection === 'repair' ? (
        <PendingDomain
          gate="GATES 4–8"
          title="Reprocessar sem duplicar"
          detail="Reparo usará as mesmas chaves idempotentes do fluxo original. Não haverá botão de regrant cego ou entrega paralela fora do ledger."
        />
      ) : null}

      {activeSection === 'audit' ? (
        <section className="premium-audit-link">
          <div>
            <span>AUDITORIA EXISTENTE</span>
            <h3>Não vamos criar um segundo log.</h3>
            <p>
              Premium reutiliza a trilha administrativa atual para ator, justificativa, operação,
              resultado e horário.
            </p>
          </div>
          <a href="/admin/audit">ABRIR AUDITORIA →</a>
        </section>
      ) : null}
    </section>
  );
}
