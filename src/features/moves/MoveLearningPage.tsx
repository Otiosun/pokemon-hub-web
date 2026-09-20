import { useCallback, useEffect, useState } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import {
  getPlayerPortalMoveChoices,
  resolvePlayerPortalMoveChoice,
  type PlayerPortalPendingMoveChoice,
} from '../../player-api/playerPortalMoveChoiceClient';
import { useOwnedPokemonCollection } from '../collection/useOwnedPokemonCollection';
import './move-learning-page.css';

type MoveLearningState =
  | { status: 'loading' }
  | {
      status: 'authenticated';
      blockedByBattle: boolean;
      choices: readonly PlayerPortalPendingMoveChoice[];
    }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export function MoveLearningPage() {
  const collection = useOwnedPokemonCollection();
  const [state, setState] = useState<MoveLearningState>({ status: 'loading' });
  const [selectedSlots, setSelectedSlots] = useState<Record<string, number>>({});
  const [resolvingChoiceId, setResolvingChoiceId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const result = await getPlayerPortalMoveChoices();
      setState(result);
    } catch {
      setState({ status: 'unavailable' });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveChoice = async (choice: PlayerPortalPendingMoveChoice, replaceSlotNo: number | null) => {
    if (resolvingChoiceId !== null || state.status !== 'authenticated') return;
    setResolvingChoiceId(choice.choiceId);
    setMessage('');

    try {
      const result = await resolvePlayerPortalMoveChoice({
        choiceId: choice.choiceId,
        replaceSlotNo,
      });

      if (result.status === 'unauthenticated') {
        setState({ status: 'unauthenticated' });
        return;
      }
      if (result.status === 'blocked') {
        setState((current) =>
          current.status === 'authenticated'
            ? { ...current, blockedByBattle: true }
            : current,
        );
        setMessage('A decisão foi bloqueada porque existe uma batalha ativa.');
        return;
      }
      if (result.status === 'stale') {
        setMessage('Esta pendência já mudou. Sincronizando novamente…');
        await load();
        return;
      }

      setState({
        status: 'authenticated',
        blockedByBattle: result.blockedByBattle,
        choices: result.choices,
      });
      setSelectedSlots((current) => {
        const next = { ...current };
        delete next[choice.choiceId];
        return next;
      });
      setMessage(
        result.result.status === 'SKIPPED'
          ? `${choice.pokemonDisplayName} manteve os movimentos atuais.`
          : `${choice.pokemonDisplayName} aprendeu ${choice.moveDisplayName}.`,
      );
      await collection.refresh();
    } catch {
      setMessage('Não foi possível concluir a decisão agora. Nenhum movimento foi alterado na tela.');
    } finally {
      setResolvingChoiceId(null);
    }
  };

  const authenticated = state.status === 'authenticated';

  return (
    <main className="move-learning-page">
      <HubModuleHeader
        module="journey"
        metaLabel="MOVIMENTOS"
        metaValue={
          authenticated
            ? `${state.choices.length} PENDÊNCIA${state.choices.length === 1 ? '' : 'S'}`
            : state.status === 'loading'
              ? 'SINCRONIZANDO'
              : 'INDISPONÍVEL'
        }
      />

      <section className="move-learning-shell">
        <header className="move-learning-head">
          <div>
            <span>APRENDIZADO</span>
            <h1>Movimentos</h1>
            <p>
              Decisões pendentes de aprendizado dos seus Pokémon. A regra e a persistência são as
              mesmas usadas pelo bot.
            </p>
          </div>
          <a href="/jornada" data-nav-mode="up">VOLTAR À JORNADA</a>
        </header>

        {state.status === 'loading' ? (
          <div className="move-learning-state">Sincronizando decisões pendentes…</div>
        ) : state.status === 'unauthenticated' ? (
          <div className="move-learning-state">
            Sua sessão não está ativa. Abra o Hub novamente pelo acesso do bot.
          </div>
        ) : state.status === 'unavailable' ? (
          <div className="move-learning-state">Não foi possível consultar os movimentos agora.</div>
        ) : (
          <>
            {state.blockedByBattle ? (
              <div className="move-learning-blocked" role="status">
                <strong>BATALHA ATIVA</strong>
                <span>Você pode consultar as pendências, mas não alterar movimentos até a batalha terminar.</span>
              </div>
            ) : null}

            {message ? <div className="move-learning-message" role="status">{message}</div> : null}

            {state.choices.length === 0 ? (
              <div className="move-learning-state">Nenhum Pokémon está aguardando uma decisão de aprendizado.</div>
            ) : (
              <div className="move-learning-list">
                {state.choices.map((choice) => {
                  const selectedSlot = selectedSlots[choice.choiceId] ?? null;
                  const resolving = resolvingChoiceId === choice.choiceId;
                  const disabled = state.blockedByBattle || resolvingChoiceId !== null;
                  return (
                    <article className="move-learning-card" key={choice.choiceId}>
                      <header>
                        <div>
                          <span>NV. {choice.learnLevel}</span>
                          <strong>{choice.pokemonDisplayName}</strong>
                        </div>
                        <a href={`/pokemon/${choice.pokemonInstanceId}?origin=journey-moves`}>
                          VER POKÉMON
                        </a>
                      </header>

                      <div className="move-learning-offer">
                        <small>QUER APRENDER</small>
                        <strong>{choice.moveDisplayName}</strong>
                      </div>

                      <div className="move-learning-current">
                        <span>MOVIMENTOS ATUAIS</span>
                        <div className="move-learning-slots">
                          {choice.currentMoves.map((move) => (
                            <button
                              key={move.slotNo}
                              type="button"
                              disabled={disabled}
                              aria-pressed={selectedSlot === move.slotNo}
                              className={selectedSlot === move.slotNo ? 'is-selected' : undefined}
                              onClick={() =>
                                setSelectedSlots((current) => ({
                                  ...current,
                                  [choice.choiceId]: move.slotNo,
                                }))
                              }
                            >
                              <small>SLOT {move.slotNo}</small>
                              <strong>{move.displayName}</strong>
                            </button>
                          ))}
                        </div>
                      </div>

                      <footer>
                        <button
                          type="button"
                          className="is-skip"
                          disabled={disabled}
                          onClick={() => void resolveChoice(choice, null)}
                        >
                          PULAR
                        </button>
                        <button
                          type="button"
                          className="is-learn"
                          disabled={disabled || selectedSlot === null}
                          onClick={() =>
                            selectedSlot === null ? undefined : void resolveChoice(choice, selectedSlot)
                          }
                        >
                          {resolving ? 'SALVANDO…' : 'APRENDER'}
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
