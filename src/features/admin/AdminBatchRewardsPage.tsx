import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { HubMenuTrigger } from '../../components/HubNavigation';
import {
  searchAdminPlayers,
  type AdminPlayerSearchItem,
  type AdminPlayerStatus,
} from '../../player-api/playerPortalAdminPlayersClient';
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

const STATUS_OPTIONS: Array<{ value: AdminPlayerStatus; label: string }> = [
  { value: 'ACTIVE', label: 'ATIVOS' },
  { value: 'SUSPENDED', label: 'SUSPENSOS' },
  { value: 'ARCHIVED', label: 'ARQUIVADOS' },
];

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
  const [delta, setDelta] = useState('');
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
  const canUseBatch =
    capabilities.includes('batch.preview') &&
    capabilities.includes('batch.execute.low_risk') &&
    capabilities.includes('progression.adjust') &&
    capabilities.includes('player.read');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

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
      delta,
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
              : `Concluído com erros: ${result.value.successCount} sucessos e ${result.value.failureCount} falhas.`,
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
              Distribua progressão para vários jogadores sem repetir comandos. Primeiro o sistema
              congela os alvos e mostra o preview; a execução só fica disponível depois.
            </p>
          </div>
          <div className="admin-batch-badge">
            <span>MODO ATUAL</span>
            <strong>PROGRESSÃO</strong>
            <small>itens e wallet entram no mesmo motor depois</small>
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
          <header><span>02 · RECOMPENSA</span><strong>PROGRESSÃO</strong></header>
          <div className="admin-batch-fields">
            <label>
              <span>DELTA DE PONTOS</span>
              <input
                value={delta}
                inputMode="numeric"
                placeholder="+50 ou -20"
                onChange={(event) => {
                  setDelta(event.target.value);
                  invalidatePreview();
                }}
              />
            </label>
            <label className="is-reason">
              <span>MOTIVO ADMINISTRATIVO</span>
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
          <button
            className="admin-batch-preview-button"
            type="button"
            disabled={state.kind === 'previewing' || state.kind === 'executing'}
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
              <article><span>DELTA</span><strong>{delta}</strong></article>
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
