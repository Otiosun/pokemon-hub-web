import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  searchAdminPlayers,
  type AdminPlayerSearchItem,
  type AdminPlayerStatus,
} from '../../player-api/playerPortalAdminPlayersClient';
import {
  getAdminRewardCatalog,
  type AdminRewardCatalogCurrency,
  type AdminRewardCatalogItem,
  type AdminRewardCatalogSpecies,
} from '../../player-api/playerPortalAdminRewardCatalogClient';
import { usePlayerPortalAdmin } from '../../player-api/usePlayerPortalAdmin';
import {
  buildBatchRewardExecuteRequest,
  buildBatchRewardPreviewRequest,
  runBatchRewardExecution,
  runBatchRewardPreview,
  type AdminBatchRewardPreview,
} from './adminBatchRewardWorkflow';
import './admin-page.css';
import './admin-batch-rewards.css';

type TargetMode = 'SELECTED' | 'STATUS';
type RewardKind = 'PROGRESSION' | 'WALLET' | 'ITEM' | 'POKEDEX_SEEN';
type RewardDirection = 'ADD' | 'REMOVE';

const STATUS_OPTIONS: Array<{ value: AdminPlayerStatus; label: string }> = [
  { value: 'ACTIVE', label: 'ATIVOS' },
  { value: 'SUSPENDED', label: 'SUSPENSOS' },
  { value: 'ARCHIVED', label: 'ARQUIVADOS' },
];

function batchFailureCodeSummary(failures: Array<Record<string, unknown>>): string {
  const counts = new Map<string, number>();
  for (const failure of failures) {
    const code = typeof failure.errorCode === 'string' ? failure.errorCode : 'UNKNOWN';
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => `${code} ×${count}`)
    .join(' · ');
}

function HiddenAdminRoute() {
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

export function AdminBatchRewardsPage() {
  const admin = usePlayerPortalAdmin();
  const [targetMode, setTargetMode] = useState<TargetMode>('SELECTED');
  const [filterStatus, setFilterStatus] = useState<AdminPlayerStatus>('ACTIVE');
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<AdminPlayerSearchItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [rewardKind, setRewardKind] = useState<RewardKind>('PROGRESSION');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<RewardDirection>('ADD');
  const [currencyId, setCurrencyId] = useState('');
  const [itemId, setItemId] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [shinySeen, setShinySeen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<AdminRewardCatalogItem[]>([]);
  const [catalogCurrencies, setCatalogCurrencies] = useState<AdminRewardCatalogCurrency[]>([]);
  const [catalogSpecies, setCatalogSpecies] = useState<AdminRewardCatalogSpecies[]>([]);
  const [catalogState, setCatalogState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<AdminBatchRewardPreview | null>(null);
  const [previewRequestId, setPreviewRequestId] = useState<string | null>(null);
  const [executeRequestId, setExecuteRequestId] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'previewing'; text: string }
    | { kind: 'previewed'; text: string }
    | { kind: 'executing'; text: string }
    | { kind: 'success'; text: string }
    | { kind: 'error'; text: string }
  >({ kind: 'idle' });

  const capabilities = admin.status === 'admin' ? admin.admin.capabilities : [];
  const canUseProgression = capabilities.includes('progression.adjust');
  const canUseWallet =
    capabilities.includes('wallet.adjust') && capabilities.includes('economy.read');
  const canUseItem =
    capabilities.includes('inventory.adjust') && capabilities.includes('inventory.read');
  const canUsePokedexSeen =
    capabilities.includes('pokedex.seen.grant') && capabilities.includes('pokedex.read');
  const canUseBatch =
    capabilities.includes('batch.preview') &&
    capabilities.includes('batch.execute.low_risk') &&
    capabilities.includes('player.read') &&
    (canUseProgression || canUseWallet || canUseItem || canUsePokedexSeen);

  const rewardKinds = useMemo(
    () => [
      ...(canUseProgression ? ([{ value: 'PROGRESSION', label: 'PROGRESSÃO' }] as const) : []),
      ...(canUseWallet ? ([{ value: 'WALLET', label: 'DINHEIRO' }] as const) : []),
      ...(canUseItem ? ([{ value: 'ITEM', label: 'ITEM' }] as const) : []),
      ...(canUsePokedexSeen ? ([{ value: 'POKEDEX_SEEN', label: 'POKÉDEX · VISTO' }] as const) : []),
    ],
    [canUseItem, canUsePokedexSeen, canUseProgression, canUseWallet],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const signedDelta = direction === 'REMOVE' ? `-${amount}` : amount;
  const displayDelta = amount ? `${direction === 'REMOVE' ? '−' : '+'}${amount}` : '—';

  const invalidatePreview = () => {
    setPreview(null);
    setPreviewRequestId(null);
    setExecuteRequestId(null);
    setState({ kind: 'idle' });
  };

  useEffect(() => {
    if (!canUseBatch || targetMode !== 'SELECTED') return;
    let active = true;
    setSearchState('loading');
    void searchAdminPlayers({ status: 'ACTIVE', limit: 50 })
      .then((result) => {
        if (!active) return;
        if (result.status !== 'ok') {
          setPlayers([]);
          setSearchState('error');
          return;
        }
        setPlayers(result.players);
        setSearchState('idle');
      })
      .catch(() => {
        if (active) setSearchState('error');
      });

    return () => {
      active = false;
    };
  }, [canUseBatch, targetMode]);

  useEffect(() => {
    if (!canUseBatch || (!canUseWallet && !canUseItem && !canUsePokedexSeen)) return;
    let active = true;
    setCatalogState('loading');
    void getAdminRewardCatalog()
      .then((result) => {
        if (!active) return;
        if (result.status !== 'ok') {
          setCatalogItems([]);
          setCatalogCurrencies([]);
          setCatalogSpecies([]);
          setCatalogState('error');
          return;
        }
        setCatalogItems(result.items);
        setCatalogCurrencies(result.currencies);
        setCatalogSpecies(result.species);
        setCurrencyId((current) => current || result.currencies[0]?.currencyId || '');
        setItemId((current) => current || result.items[0]?.itemId || '');
        setSpeciesId((current) => current || result.species[0]?.speciesId || '');
        setCatalogState('idle');
      })
      .catch(() => {
        if (active) setCatalogState('error');
      });

    return () => {
      active = false;
    };
  }, [canUseBatch, canUseItem, canUsePokedexSeen, canUseWallet]);

  useEffect(() => {
    if (rewardKind === 'PROGRESSION' && canUseProgression) return;
    if (rewardKind === 'WALLET' && canUseWallet) return;
    if (rewardKind === 'ITEM' && canUseItem) return;
    if (rewardKind === 'POKEDEX_SEEN' && canUsePokedexSeen) return;
    const first = rewardKinds[0]?.value;
    if (first) setRewardKind(first);
  }, [canUseItem, canUsePokedexSeen, canUseProgression, canUseWallet, rewardKind, rewardKinds]);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setSearchState('loading');
    try {
      const result = await searchAdminPlayers({
        query,
        status: 'ACTIVE',
        limit: 50,
      });
      if (result.status !== 'ok') {
        setPlayers([]);
        setSearchState('error');
        return;
      }
      setPlayers(result.players);
      setSearchState('idle');
    } catch {
      setSearchState('error');
    }
  };

  if (admin.status === 'loading') {
    return (
      <main className="admin-page">
        <header className="admin-topbar">
          <div><small>POKÉMON BEYOND</small><strong>RECOMPENSAS EM MASSA</strong></div>
          <HubMenuTrigger />
        </header>
        <section className="admin-loading">VALIDANDO ACESSO ADMINISTRATIVO…</section>
      </main>
    );
  }

  if (!canUseBatch) return <HiddenAdminRoute />;

  const togglePlayer = (playerId: string) => {
    setSelectedIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
    invalidatePreview();
  };

  const previewBatch = async () => {
    const requestId = previewRequestId ?? crypto.randomUUID();
    const built = buildBatchRewardPreviewRequest({
      requestId,
      target:
        targetMode === 'SELECTED'
          ? { kind: 'PLAYER_IDS', playerIds: selectedIds }
          : { kind: 'PLAYER_FILTER', status: filterStatus },
      reward:
        rewardKind === 'PROGRESSION'
          ? { kind: 'TRAINER_PROGRESSION', delta: signedDelta }
          : rewardKind === 'WALLET'
            ? { kind: 'WALLET', currencyId, delta: signedDelta }
            : rewardKind === 'ITEM'
              ? { kind: 'ITEM', itemId, delta: signedDelta }
              : { kind: 'POKEDEX_SEEN', speciesId, shiny: shinySeen },
      reason,
    });

    if (!built.ok) {
      setState({ kind: 'error', text: built.message });
      return;
    }

    if (previewRequestId === null) setPreviewRequestId(requestId);
    setState({ kind: 'previewing', text: 'CONGELANDO ALVOS E GERANDO PREVIEW…' });

    try {
      const result = await runBatchRewardPreview(built.request);
      if (result.status === 'applied') {
        setPreview(result.value);
        setPreviewRequestId(null);
        setExecuteRequestId(null);
        setState({
          kind: 'previewed',
          text: 'Preview congelado. Revise a quantidade de jogadores antes de executar.',
        });
        return;
      }

      setPreviewRequestId(null);
      setState({
        kind: 'error',
        text:
          result.status === 'denied'
            ? 'Sua sessão não possui autorização para criar este lote.'
            : `Preview rejeitado: ${result.code}`,
      });
    } catch {
      setState({
        kind: 'error',
        text: 'Falha de rede. O mesmo requestId será reutilizado na próxima tentativa.',
      });
    }
  };

  const executeBatch = async () => {
    if (preview === null) return;
    const requestId = executeRequestId ?? crypto.randomUUID();
    const built = buildBatchRewardExecuteRequest({
      requestId,
      preview,
      reason,
    });
    if (!built.ok) {
      setState({ kind: 'error', text: built.message });
      return;
    }

    if (executeRequestId === null) setExecuteRequestId(requestId);
    setState({ kind: 'executing', text: 'CONFIRMANDO E EXECUTANDO LOTE…' });

    try {
      const result = await runBatchRewardExecution(built.request);
      if (result.status === 'applied') {
        setExecuteRequestId(null);
        setState({
          kind: 'success',
          text:
            result.value.failureCount === 0
              ? `Concluído: ${result.value.successCount}/${result.value.targetCount} jogadores atualizados.`
              : `Concluído com erros: ${result.value.successCount} sucessos e ${result.value.failureCount} falhas. ${batchFailureCodeSummary(result.value.failures)}`,
        });
        return;
      }

      setExecuteRequestId(null);
      setState({
        kind: 'error',
        text:
          result.status === 'denied'
            ? 'Sua sessão não possui autorização para executar este lote.'
            : `Execução rejeitada: ${result.code}`,
      });
    } catch {
      setState({
        kind: 'error',
        text: 'Falha de rede. O mesmo requestId será reutilizado na próxima tentativa.',
      });
    }
  };

  const previewName = (playerId: string) =>
    players.find((player) => player.playerId === playerId)?.trainerName ?? playerId;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><small>CENTRAL ADM · ECONOMIA</small><strong>RECOMPENSAS EM MASSA</strong></div>
        <HubMenuTrigger />
      </header>

      <section className="admin-shell admin-batch-shell">
        <div className="admin-breadcrumb">
          <a href="/admin">CENTRAL ADM</a><span>›</span><strong>RECOMPENSAS EM MASSA</strong>
        </div>

        <header className="admin-batch-heading">
          <div>
            <span className="admin-kicker">LIVE OPS · R3 NA EXECUÇÃO</span>
            <h1>Recompensa em massa</h1>
            <p>
              Escolha quem recebe, o que será alterado e confira tudo antes de aplicar.
              Nada é executado enquanto você estiver apenas no preview.
            </p>
          </div>
          <div className="admin-batch-badge">
            <span>MODO ATUAL</span>
            <strong>{rewardKind === 'PROGRESSION'
              ? 'PROGRESSÃO'
              : rewardKind === 'WALLET'
                ? 'DINHEIRO'
                : rewardKind === 'ITEM'
                  ? 'ITEM'
                  : 'POKÉDEX · VISTO'}</strong>
            <small>revise antes de aplicar</small>
          </div>
        </header>

        <section className="admin-batch-builder">
          <header><span>01 · ALVOS</span><strong>{targetMode === 'SELECTED' ? selectedIds.length : filterStatus}</strong></header>
          <nav className="admin-batch-mode">
            <button
              type="button"
              className={targetMode === 'SELECTED' ? 'is-active' : ''}
              onClick={() => {
                setTargetMode('SELECTED');
                invalidatePreview();
              }}
            >
              SELECIONAR JOGADORES
            </button>
            <button
              type="button"
              className={targetMode === 'STATUS' ? 'is-active' : ''}
              onClick={() => {
                setTargetMode('STATUS');
                invalidatePreview();
              }}
            >
              FILTRO POR STATUS
            </button>
          </nav>

          {targetMode === 'SELECTED' ? (
            <>
              <form className="admin-batch-search" onSubmit={search}>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar nome do treinador"
                  maxLength={80}
                />
                <button type="submit" disabled={searchState === 'loading'}>
                  {searchState === 'loading' ? 'BUSCANDO…' : 'BUSCAR'}
                </button>
              </form>
              {searchState === 'error' ? (
                <p className="admin-batch-message is-error">Falha ao consultar jogadores.</p>
              ) : (
                <div className="admin-batch-player-list">
                  {players.map((player) => (
                    <label key={player.playerId} className={selectedSet.has(player.playerId) ? 'is-selected' : ''}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(player.playerId)}
                        onChange={() => togglePlayer(player.playerId)}
                      />
                      <span>
                        <strong>{player.trainerName ?? 'Treinador sem nome'}</strong>
                        <small>Lv. {player.trainerLevel} · {player.insigniaPoints} pontos</small>
                      </span>
                      <code>{player.playerId.slice(0, 8)}</code>
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : (
            <label className="admin-batch-status-filter">
              <span>STATUS DOS JOGADORES</span>
              <select
                value={filterStatus}
                onChange={(event) => {
                  setFilterStatus(event.target.value as AdminPlayerStatus);
                  invalidatePreview();
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small>O backend limita o snapshot a no máximo 1000 jogadores.</small>
            </label>
          )}
        </section>

        <section className="admin-batch-builder">
          <header>
            <span>02 · RECOMPENSA</span>
            <strong>{rewardKind === 'PROGRESSION'
              ? 'PROGRESSÃO'
              : rewardKind === 'WALLET'
                ? 'DINHEIRO'
                : rewardKind === 'ITEM'
                  ? 'ITEM'
                  : 'POKÉDEX · VISTO'}</strong>
          </header>

          <div className="admin-batch-mode">
            {rewardKinds.map((option) => (
              <button
                key={option.value}
                type="button"
                className={rewardKind === option.value ? 'is-active' : ''}
                onClick={() => {
                  setRewardKind(option.value);
                  invalidatePreview();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="admin-batch-fields">
            {rewardKind === 'WALLET' ? (
              <label>
                <span>MOEDA</span>
                <select
                  value={currencyId}
                  disabled={catalogState === 'loading'}
                  onChange={(event) => {
                    setCurrencyId(event.target.value);
                    invalidatePreview();
                  }}
                >
                  {catalogCurrencies.map((currency) => (
                    <option key={currency.currencyId} value={currency.currencyId}>
                      {currency.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : rewardKind === 'ITEM' ? (
              <label>
                <span>ITEM</span>
                <select
                  value={itemId}
                  disabled={catalogState === 'loading'}
                  onChange={(event) => {
                    setItemId(event.target.value);
                    invalidatePreview();
                  }}
                >
                  {catalogItems.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.displayName} · {item.itemKind}
                    </option>
                  ))}
                </select>
              </label>
            ) : rewardKind === 'POKEDEX_SEEN' ? (
              <>
                <label>
                  <span>ESPÉCIE</span>
                  <select
                    value={speciesId}
                    disabled={catalogState === 'loading'}
                    onChange={(event) => {
                      setSpeciesId(event.target.value);
                      invalidatePreview();
                    }}
                  >
                    {catalogSpecies.map((species) => (
                      <option key={species.speciesId} value={species.speciesId}>
                        #{String(species.nationalDex).padStart(3, '0')} · {species.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>REGISTRO</span>
                  <select
                    value={shinySeen ? 'SHINY' : 'NORMAL'}
                    onChange={(event) => {
                      setShinySeen(event.target.value === 'SHINY');
                      invalidatePreview();
                    }}
                  >
                    <option value="NORMAL">VISTO</option>
                    <option value="SHINY">VISTO · SHINY</option>
                  </select>
                </label>
              </>
            ) : null}

            {rewardKind !== 'POKEDEX_SEEN' ? (
              <div className="admin-batch-amount">
                <span className="admin-batch-field-label">O QUE FAZER</span>
                <div className="admin-batch-direction" role="group" aria-label="Tipo de alteração">
                  <button
                    type="button"
                    className={direction === 'ADD' ? 'is-active' : ''}
                    onClick={() => {
                      setDirection('ADD');
                      invalidatePreview();
                    }}
                  >
                    + DAR
                  </button>
                  <button
                    type="button"
                    className={direction === 'REMOVE' ? 'is-active is-remove' : 'is-remove'}
                    onClick={() => {
                      setDirection('REMOVE');
                      invalidatePreview();
                    }}
                  >
                    − REMOVER
                  </button>
                </div>
                <label>
                  <span>{rewardKind === 'PROGRESSION' ? 'QUANTIDADE DE PONTOS' : 'QUANTIDADE'}</span>
                  <input
                    value={amount}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={rewardKind === 'PROGRESSION' ? '50' : '1'}
                    onChange={(event) => {
                      setAmount(event.target.value.replace(/\D/g, ''));
                      invalidatePreview();
                    }}
                  />
                </label>
                <small className="admin-batch-change-preview">
                  {amount
                    ? direction === 'ADD'
                      ? `Será adicionado: +${amount}`
                      : `Será removido: −${amount}`
                    : 'Digite somente o número. O sinal é aplicado automaticamente.'}
                </small>
              </div>
            ) : null}

            <label className="is-reason">
              <span>MOTIVO · FICA NO HISTÓRICO</span>
              <textarea
                value={reason}
                maxLength={2000}
                placeholder="Ex.: recompensa do evento semanal"
                onChange={(event) => {
                  setReason(event.target.value);
                  invalidatePreview();
                }}
              />
            </label>
          </div>

          {catalogState === 'error' && rewardKind !== 'PROGRESSION' ? (
            <p className="admin-batch-message is-error">
              Falha ao carregar o catálogo real de recompensas.
            </p>
          ) : null}

          <button
            className="admin-batch-preview-button"
            type="button"
            disabled={
              state.kind === 'previewing' ||
              state.kind === 'executing' ||
              (rewardKind === 'WALLET' && !currencyId) ||
              (rewardKind === 'ITEM' && !itemId) ||
              (rewardKind === 'POKEDEX_SEEN' && !speciesId)
            }
            onClick={() => void previewBatch()}
          >
            {state.kind === 'previewing' ? 'GERANDO PREVIEW…' : 'GERAR PREVIEW'}
          </button>
        </section>

        {preview ? (
          <section className="admin-batch-preview">
            <header>
              <div><span>03 · PREVIEW CONGELADO</span><strong>{preview.targetCount} ALVOS</strong></div>
              <small>batch {preview.batchId.slice(0, 8)} · rev. {preview.revision}</small>
            </header>
            <div className="admin-batch-preview-grid">
              <article><span>JOGADORES</span><strong>{preview.targetCount}</strong></article>
              <article>
                <span>RECOMPENSA</span>
                <strong>
                  {rewardKind === 'PROGRESSION'
                    ? displayDelta
                    : rewardKind === 'WALLET'
                      ? `${displayDelta} · ${catalogCurrencies.find((currency) => currency.currencyId === currencyId)?.displayName ?? 'moeda'}`
                      : rewardKind === 'ITEM'
                        ? `${displayDelta} × ${catalogItems.find((item) => item.itemId === itemId)?.displayName ?? 'item'}`
                        : `${shinySeen ? 'VISTO · SHINY' : 'VISTO'} · ${catalogSpecies.find((species) => species.speciesId === speciesId)?.displayName ?? 'espécie'}`}
                </strong>
              </article>
              <article><span>CHUNKS</span><strong>{preview.estimatedChunks}</strong></article>
              <article><span>TAMANHO</span><strong>{preview.chunkSize}</strong></article>
            </div>
            {preview.sampleTargetIds.length ? (
              <div className="admin-batch-sample">
                <span>AMOSTRA DO SNAPSHOT</span>
                {preview.sampleTargetIds.map((id) => <code key={id}>{previewName(id)}</code>)}
              </div>
            ) : null}
            <div className="admin-batch-confirm">
              <div>
                <strong>CONFIRMAR EXECUÇÃO</strong>
                <p>
                  Esta ação usa exatamente o snapshot acima. Mudanças posteriores na busca não
                  alteram este lote.
                </p>
              </div>
              <button
                type="button"
                disabled={state.kind === 'executing' || state.kind === 'success'}
                onClick={() => void executeBatch()}
              >
                {state.kind === 'executing' ? 'EXECUTANDO…' : 'EXECUTAR RECOMPENSA'}
              </button>
            </div>
          </section>
        ) : null}

        {state.kind === 'previewed' || state.kind === 'success' ? (
          <p className="admin-batch-message is-success">{state.text}</p>
        ) : state.kind === 'error' ? (
          <p className="admin-batch-message is-error">{state.text}</p>
        ) : null}
      </section>
    </main>
  );
}
