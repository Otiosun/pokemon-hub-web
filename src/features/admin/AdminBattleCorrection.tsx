import { useMemo, useState } from 'react';
import type {
  AdminPlayer360,
  AdminPlayerPokemon,
} from '../../player-api/playerPortalAdminPlayersClient';
import { runAdminRepairOperation } from './adminRepairOperationWorkflow';

type Props = {
  playerId: string;
  capabilities: readonly string[];
  activeBattle: AdminPlayer360['activeBattle'];
  pokemon: AdminPlayerPokemon[];
  onApplied: () => void;
};

const STATUS_OPTIONS = [
  'UNCHANGED',
  'CLEAR',
  'BURN',
  'POISON',
  'BAD_POISON',
  'PARALYSIS',
  'SLEEP',
  'FREEZE',
] as const;

export function AdminBattleCorrection({
  playerId,
  capabilities,
  activeBattle,
  pokemon,
  onApplied,
}: Props) {
  const canCorrect = capabilities.includes('battle.correct_state');
  const participants = activeBattle?.participants ?? [];
  const [participantId, setParticipantId] = useState(participants[0]?.participantId ?? '');
  const selected =
    participants.find((participant) => participant.participantId === participantId) ??
    participants[0];
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('UNCHANGED');
  const [statusCounter, setStatusCounter] = useState('');
  const [moveSlot, setMoveSlot] = useState('');
  const [movePp, setMovePp] = useState('');
  const [reason, setReason] = useState('');
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'busy' }
    | { kind: 'success' | 'error' | 'approval'; text: string }
  >({ kind: 'idle' });

  const pokemonById = useMemo(
    () => new Map(pokemon.map((entry) => [entry.id, entry])),
    [pokemon],
  );

  if (!canCorrect || !activeBattle || !participants.length) return null;

  const apply = async () => {
    if (activeBattle.battleType === 'PVP') {
      setState({ kind: 'error', text: 'Correção subject-scoped não é permitida em batalha PVP.' });
      return;
    }
    if (!selected) {
      setState({ kind: 'error', text: 'Escolha um participante da batalha.' });
      return;
    }
    if (!reason.trim()) {
      setState({ kind: 'error', text: 'Informe o motivo da correção.' });
      return;
    }

    const correction: Record<string, unknown> = { participantId: selected.participantId };
    if (hp.trim()) {
      const parsed = Number(hp);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > selected.maxHp) {
        setState({ kind: 'error', text: `HP deve ficar entre 1 e ${selected.maxHp}.` });
        return;
      }
      correction.currentHp = parsed;
    }

    if (status !== 'UNCHANGED') {
      if (status === 'CLEAR') {
        correction.majorStatus = null;
      } else {
        const parsedCounter = statusCounter.trim() ? Number(statusCounter) : null;
        if (
          parsedCounter !== null &&
          (!Number.isInteger(parsedCounter) || parsedCounter < 0 || parsedCounter > 15)
        ) {
          setState({ kind: 'error', text: 'O contador de status deve ficar entre 0 e 15.' });
          return;
        }
        correction.majorStatus = { key: status, counter: parsedCounter };
      }
    }

    if (moveSlot) {
      const slotNo = Number(moveSlot);
      const ppCurrent = Number(movePp);
      const move = selected.moves.find((entry) => entry.slotNo === slotNo);
      if (!move || !Number.isInteger(ppCurrent) || ppCurrent < 0 || ppCurrent > (move.maxPp ?? 99)) {
        setState({ kind: 'error', text: 'Informe um PP válido para o golpe selecionado.' });
        return;
      }
      correction.movePp = { slotNo, ppCurrent };
    }

    if (Object.keys(correction).length === 1) {
      setState({ kind: 'error', text: 'Escolha pelo menos uma correção: HP, status ou PP.' });
      return;
    }

    setState({ kind: 'busy' });
    try {
      const result = await runAdminRepairOperation({
        requestId: crypto.randomUUID(),
        operationType: 'battle.correct_state',
        input: {
          playerId,
          battleId: activeBattle.id,
          ...correction,
        },
        reason: reason.trim(),
        expectedRevision: activeBattle.version,
      });
      if (result.status === 'applied') {
        setState({ kind: 'success', text: 'Estado da batalha corrigido e auditado.' });
        setHp('');
        setStatus('UNCHANGED');
        setStatusCounter('');
        setMoveSlot('');
        setMovePp('');
        setReason('');
        onApplied();
        return;
      }
      if (result.status === 'awaiting-approval') {
        setState({ kind: 'approval', text: 'A correção aguarda aprovação independente.' });
        return;
      }
      if (result.status === 'denied') {
        setState({ kind: 'error', text: 'Sua sessão não possui autorização para esta correção.' });
        return;
      }
      setState({ kind: 'error', text: `Correção rejeitada: ${result.code}` });
    } catch {
      setState({ kind: 'error', text: 'Falha de rede ao corrigir a batalha.' });
    }
  };

  const selectedPokemon =
    selected?.pokemonInstanceId ? pokemonById.get(selected.pokemonInstanceId) : undefined;

  return (
    <section className="admin-player-adjustments admin-battle-correction">
      <header>
        <div>
          <span>BATALHA</span>
          <strong>CORRIGIR ESTADO</strong>
        </div>
        <small>HP · STATUS · PP</small>
      </header>

      <div className="admin-operation-fields">
        <label>
          <span>PARTICIPANTE</span>
          <select value={selected?.participantId ?? ''} onChange={(event) => setParticipantId(event.target.value)}>
            {participants.map((participant) => {
              const owned =
                participant.pokemonInstanceId === null
                  ? null
                  : pokemonById.get(participant.pokemonInstanceId);
              return (
                <option key={participant.participantId} value={participant.participantId}>
                  {owned?.nickname ?? owned?.speciesSlug ?? 'Pokémon'} · Lv. {participant.level} · HP {participant.currentHp}/{participant.maxHp}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          <span>NOVO HP · opcional</span>
          <input
            inputMode="numeric"
            value={hp}
            placeholder={selected ? `${selected.currentHp} / ${selected.maxHp}` : ''}
            onChange={(event) => setHp(event.target.value.replace(/\D/g, ''))}
          />
        </label>

        <label>
          <span>STATUS</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as (typeof STATUS_OPTIONS)[number])}>
            <option value="UNCHANGED">NÃO ALTERAR</option>
            <option value="CLEAR">LIMPAR STATUS</option>
            <option value="BURN">BURN</option>
            <option value="POISON">POISON</option>
            <option value="BAD_POISON">BAD POISON</option>
            <option value="PARALYSIS">PARALYSIS</option>
            <option value="SLEEP">SLEEP</option>
            <option value="FREEZE">FREEZE</option>
          </select>
        </label>

        {status !== 'UNCHANGED' && status !== 'CLEAR' ? (
          <label>
            <span>CONTADOR · opcional</span>
            <input
              inputMode="numeric"
              value={statusCounter}
              onChange={(event) => setStatusCounter(event.target.value.replace(/\D/g, ''))}
            />
          </label>
        ) : null}

        <label>
          <span>GOLPE / PP · opcional</span>
          <select
            value={moveSlot}
            onChange={(event) => {
              setMoveSlot(event.target.value);
              setMovePp('');
            }}
          >
            <option value="">NÃO ALTERAR</option>
            {selected?.moves.map((move) => (
              <option key={move.slotNo} value={String(move.slotNo)}>
                Slot {move.slotNo} · PP {move.ppCurrent ?? '—'}/{move.maxPp ?? '—'}
              </option>
            ))}
          </select>
        </label>

        {moveSlot ? (
          <label>
            <span>NOVO PP</span>
            <input
              inputMode="numeric"
              value={movePp}
              onChange={(event) => setMovePp(event.target.value.replace(/\D/g, ''))}
            />
          </label>
        ) : null}

        <label className="is-reason">
          <span>MOTIVO</span>
          <textarea
            value={reason}
            maxLength={2000}
            placeholder="Explique o que ficou incorreto na batalha"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      </div>

      <div className="admin-adjustment-submit">
        <div>
          <span>{selectedPokemon?.nickname ?? selectedPokemon?.speciesSlug ?? 'Pokémon selecionado'}</span>
          <small>Batalha v{activeBattle.version}</small>
        </div>
        <button
          type="button"
          disabled={state.kind === 'busy' || activeBattle.battleType === 'PVP'}
          onClick={() => void apply()}
        >
          {state.kind === 'busy' ? 'VALIDANDO…' : 'APLICAR CORREÇÃO'}
        </button>
      </div>

      {'text' in state ? (
        <p className={`admin-adjustment-feedback is-${state.kind}`}>{state.text}</p>
      ) : null}
    </section>
  );
}
