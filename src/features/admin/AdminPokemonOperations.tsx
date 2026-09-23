import { useMemo, useState, type FormEvent } from 'react';
import type { AdminPlayerPokemon } from '../../player-api/playerPortalAdminPlayersClient';
import {
  buildAdminPokemonOperation,
  capabilityForPokemonAction,
  runAdminPokemonOperation,
  type AdminPokemonAction,
  type AdminPokemonOperationFields,
} from './adminPokemonOperationWorkflow';

type AdminPokemonOperationsProps = {
  playerId: string;
  capabilities: readonly string[];
  pokemon: AdminPlayerPokemon[];
  onApplied: () => void;
};

const ACTION_LABEL: Record<AdminPokemonAction, string> = {
  ROSTER: 'TIME / BOX',
  PROGRESS: 'NÍVEL / XP',
  HP: 'HP',
  STATUS: 'STATUS',
  ARCHIVE: 'ARQUIVAR',
};

const ALL_ACTIONS: AdminPokemonAction[] = ['ROSTER', 'PROGRESS', 'HP', 'STATUS', 'ARCHIVE'];

function fieldsForPokemon(pokemon: AdminPlayerPokemon | undefined): AdminPokemonOperationFields {
  const placement = pokemon?.placement;
  return {
    placementKind: placement?.kind ?? 'BOX',
    boxNo: placement?.kind === 'BOX' && placement.boxNo !== null ? String(placement.boxNo) : '1',
    slotNo: placement ? String(placement.slotNo) : '1',
    level: pokemon ? String(pokemon.level) : '1',
    xp: pokemon?.xp ?? '0',
    currentHp: pokemon ? String(pokemon.currentHp) : '0',
    majorStatus: '',
    statusCounter: '',
  };
}

export function AdminPokemonOperations({
  playerId,
  capabilities,
  pokemon,
  onApplied,
}: AdminPokemonOperationsProps) {
  const activePokemon = useMemo(() => pokemon.filter((entry) => entry.status === 'ACTIVE'), [pokemon]);
  const availableActions = ALL_ACTIONS.filter((action) =>
    capabilities.includes(capabilityForPokemonAction(action)),
  );
  const [selectedPokemonId, setSelectedPokemonId] = useState(activePokemon[0]?.id ?? '');
  const selectedPokemon =
    activePokemon.find((entry) => entry.id === selectedPokemonId) ?? activePokemon[0];
  const [selectedAction, setSelectedAction] = useState<AdminPokemonAction>(
    availableActions[0] ?? 'ROSTER',
  );
  const activeAction = availableActions.includes(selectedAction)
    ? selectedAction
    : (availableActions[0] ?? null);
  const [fields, setFields] = useState<AdminPokemonOperationFields>(() =>
    fieldsForPokemon(selectedPokemon),
  );
  const [reason, setReason] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting'; text: string }
    | { kind: 'success'; text: string }
    | { kind: 'approval'; text: string }
    | { kind: 'error'; text: string }
  >({ kind: 'idle' });

  const patchFields = (patch: Partial<AdminPokemonOperationFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    setPendingRequestId(null);
    setState({ kind: 'idle' });
  };

  const switchPokemon = (pokemonId: string) => {
    const nextPokemon = activePokemon.find((entry) => entry.id === pokemonId);
    setSelectedPokemonId(pokemonId);
    setFields(fieldsForPokemon(nextPokemon));
    setReason('');
    setPendingRequestId(null);
    setState({ kind: 'idle' });
  };

  const switchAction = (action: AdminPokemonAction) => {
    setSelectedAction(action);
    setFields(fieldsForPokemon(selectedPokemon));
    setReason('');
    setPendingRequestId(null);
    setState({ kind: 'idle' });
  };

  if (!activePokemon.length || activeAction === null) {
    return (
      <section className="admin-player-adjustments admin-pokemon-operations is-disabled">
        <header>
          <div>
            <span>MANUTENÇÃO POKÉMON</span>
            <strong>OPERAÇÕES AUDITADAS</strong>
          </div>
          <small>{!activePokemon.length ? 'SEM POKÉMON ATIVO' : 'SEM PERMISSÃO'}</small>
        </header>
        <p>
          {!activePokemon.length
            ? 'Não há Pokémon ativo nesta ficha para manutenção.'
            : 'Esta identidade não possui capabilities de manutenção Pokémon.'}
        </p>
      </section>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPokemon) {
      setState({ kind: 'error', text: 'Selecione um Pokémon ativo.' });
      return;
    }

    const requestId = pendingRequestId ?? crypto.randomUUID();
    const built = buildAdminPokemonOperation({
      action: activeAction,
      playerId,
      pokemon: selectedPokemon,
      fields,
      reason,
      requestId,
    });

    if (!built.ok) {
      setState({ kind: 'error', text: built.message });
      return;
    }

    if (pendingRequestId === null) setPendingRequestId(requestId);
    setState({
      kind: 'submitting',
      text:
        activeAction === 'ARCHIVE'
          ? 'VALIDANDO ARQUIVAMENTO…'
          : 'VALIDANDO OPERAÇÃO…',
    });

    try {
      const result = await runAdminPokemonOperation(built.request);
      if (result.status === 'applied') {
        setPendingRequestId(null);
        setReason('');
        setState({
          kind: 'success',
          text: 'Operação aplicada e registrada na trilha administrativa.',
        });
        onApplied();
        return;
      }

      if (result.status === 'awaiting-approval') {
        setPendingRequestId(null);
        setState({
          kind: 'approval',
          text: `Operação ${result.operationId} aguarda aprovação de outro administrador.`,
        });
        return;
      }

      if (result.status === 'denied') {
        setPendingRequestId(null);
        setState({ kind: 'error', text: 'Sua sessão não possui autorização para esta operação.' });
        return;
      }

      setPendingRequestId(null);
      setState({ kind: 'error', text: `Operação rejeitada: ${result.code}` });
    } catch {
      setState({
        kind: 'error',
        text: 'Falha de rede. O mesmo requestId será reutilizado na próxima tentativa.',
      });
    }
  };

  const submitLabel =
    state.kind === 'submitting'
      ? state.text
      : activeAction === 'ARCHIVE'
        ? 'ARQUIVAR POKÉMON'
        : 'APLICAR CORREÇÃO';

  return (
    <section className="admin-player-adjustments admin-pokemon-operations">
      <header>
        <div>
          <span>MANUTENÇÃO POKÉMON</span>
          <strong>OPERAÇÕES AUDITADAS</strong>
        </div>
        <small>REVISION LOCK · MOTIVO OBRIGATÓRIO</small>
      </header>

      <label className="admin-pokemon-target">
        <span>POKÉMON</span>
        <select
          value={selectedPokemon?.id ?? ''}
          onChange={(event) => switchPokemon(event.target.value)}
        >
          {activePokemon.map((entry) => (
            <option key={entry.id} value={entry.id}>
              #{String(entry.nationalDex).padStart(3, '0')} · {entry.nickname ?? entry.speciesSlug} ·
              Lv. {entry.level}
            </option>
          ))}
        </select>
        <small>
          rev. {selectedPokemon?.revision ?? '—'} · HP {selectedPokemon?.currentHp ?? '—'} · XP{' '}
          {selectedPokemon?.xp ?? '—'}
        </small>
      </label>

      <nav aria-label="Operação administrativa Pokémon">
        {availableActions.map((action) => (
          <button
            key={action}
            type="button"
            className={activeAction === action ? 'is-active' : ''}
            onClick={() => switchAction(action)}
          >
            {ACTION_LABEL[action]}
          </button>
        ))}
      </nav>

      <form onSubmit={submit}>
        {activeAction === 'ROSTER' ? (
          <>
            <label>
              <span>DESTINO</span>
              <select
                value={fields.placementKind}
                onChange={(event) =>
                  patchFields({ placementKind: event.target.value as 'TEAM' | 'BOX' })
                }
              >
                <option value="TEAM">TIME</option>
                <option value="BOX">BOX</option>
              </select>
            </label>
            {fields.placementKind === 'BOX' ? (
              <label>
                <span>BOX</span>
                <input
                  inputMode="numeric"
                  value={fields.boxNo}
                  onChange={(event) => patchFields({ boxNo: event.target.value })}
                  autoComplete="off"
                />
              </label>
            ) : null}
            <label>
              <span>SLOT</span>
              <input
                inputMode="numeric"
                value={fields.slotNo}
                onChange={(event) => patchFields({ slotNo: event.target.value })}
                autoComplete="off"
              />
            </label>
          </>
        ) : null}

        {activeAction === 'PROGRESS' ? (
          <>
            <label>
              <span>NÍVEL</span>
              <input
                inputMode="numeric"
                value={fields.level}
                onChange={(event) => patchFields({ level: event.target.value })}
                autoComplete="off"
              />
            </label>
            <label>
              <span>XP</span>
              <input
                inputMode="numeric"
                value={fields.xp}
                onChange={(event) => patchFields({ xp: event.target.value })}
                autoComplete="off"
              />
            </label>
          </>
        ) : null}

        {activeAction === 'HP' ? (
          <label>
            <span>HP ATUAL</span>
            <input
              inputMode="numeric"
              value={fields.currentHp}
              onChange={(event) => patchFields({ currentHp: event.target.value })}
              autoComplete="off"
            />
          </label>
        ) : null}

        {activeAction === 'STATUS' ? (
          <>
            <label>
              <span>STATUS PRINCIPAL</span>
              <select
                value={fields.majorStatus}
                onChange={(event) =>
                  patchFields({
                    majorStatus: event.target.value as AdminPokemonOperationFields['majorStatus'],
                    ...(event.target.value ? {} : { statusCounter: '' }),
                  })
                }
              >
                <option value="">LIMPAR STATUS</option>
                <option value="BURN">BURN</option>
                <option value="POISON">POISON</option>
                <option value="PARALYSIS">PARALYSIS</option>
                <option value="SLEEP">SLEEP</option>
                <option value="FREEZE">FREEZE</option>
              </select>
            </label>
            {fields.majorStatus ? (
              <label>
                <span>CONTADOR</span>
                <input
                  inputMode="numeric"
                  value={fields.statusCounter}
                  onChange={(event) => patchFields({ statusCounter: event.target.value })}
                  placeholder="opcional · 0–10"
                  autoComplete="off"
                />
              </label>
            ) : null}
          </>
        ) : null}

        {activeAction === 'ARCHIVE' ? (
          <div className="admin-pokemon-operation-warning">
            <strong>ARQUIVAMENTO</strong>
            <p>
              O Pokémon sairá do roster ativo. A operação exige a revision atual e confirmação
              auditada antes da aplicação.
            </p>
          </div>
        ) : null}

        <label className="is-reason">
          <span>MOTIVO</span>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setPendingRequestId(null);
              setState({ kind: 'idle' });
            }}
            placeholder="Explique por que esta manutenção está sendo realizada."
            maxLength={2000}
          />
        </label>

        <div className="admin-adjustment-submit">
          <div>
            <span>{ACTION_LABEL[activeAction]}</span>
            <small>
              {selectedPokemon?.nickname ?? selectedPokemon?.speciesSlug} · revision{' '}
              {selectedPokemon?.revision}
            </small>
          </div>
          <button
            type="submit"
            disabled={state.kind === 'submitting'}
            className={activeAction === 'ARCHIVE' ? 'is-danger' : ''}
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {state.kind === 'success' ? (
        <p className="admin-adjustment-feedback is-success">{state.text}</p>
      ) : state.kind === 'approval' ? (
        <p className="admin-adjustment-feedback is-approval">{state.text}</p>
      ) : state.kind === 'error' ? (
        <p className="admin-adjustment-feedback is-error">{state.text}</p>
      ) : null}
    </section>
  );
}
