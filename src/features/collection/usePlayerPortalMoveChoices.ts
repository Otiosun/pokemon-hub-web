import { useCallback, useEffect, useState } from 'react';
import {
  getPlayerPortalMoveChoices,
  resolvePlayerPortalMoveChoice,
  type PlayerPortalPendingMoveChoice,
} from '../../player-api/playerPortalMoveChoiceClient';

type MoveChoiceState =
  | { status: 'loading' }
  | {
      status: 'authenticated';
      blockedByBattle: boolean;
      choices: readonly PlayerPortalPendingMoveChoice[];
    }
  | { status: 'unauthenticated' }
  | { status: 'unavailable' };

export function usePlayerPortalMoveChoices() {
  const [state, setState] = useState<MoveChoiceState>({ status: 'loading' });
  const [savingChoiceId, setSavingChoiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getPlayerPortalMoveChoices();
      setState(result);
    } catch {
      setState({ status: 'unavailable' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resolve = useCallback(
    async (choiceId: string, replaceSlotNo: number | null) => {
      setSavingChoiceId(choiceId);
      setMessage(null);
      try {
        const result = await resolvePlayerPortalMoveChoice({ choiceId, replaceSlotNo });
        if (result.status === 'unauthenticated') {
          setState({ status: 'unauthenticated' });
          return { status: 'unauthenticated' as const };
        }
        if (result.status === 'blocked') {
          setState((current) =>
            current.status === 'authenticated'
              ? { ...current, blockedByBattle: true }
              : current,
          );
          setMessage('Alterações de golpes ficam bloqueadas durante uma batalha ativa.');
          return { status: 'blocked' as const };
        }
        if (result.status === 'stale') {
          await refresh();
          setMessage('Essa decisão já não está mais pendente.');
          return { status: 'stale' as const };
        }

        setState({
          status: 'authenticated',
          blockedByBattle: result.blockedByBattle,
          choices: result.choices,
        });
        setMessage(
          result.result.status === 'SKIPPED'
            ? 'Aprendizado ignorado. Os golpes atuais foram preservados.'
            : 'Novo golpe aprendido com sucesso.',
        );
        return { status: 'authenticated' as const, result: result.result };
      } catch {
        setMessage('Não foi possível concluir a decisão de aprendizado.');
        return { status: 'unavailable' as const };
      } finally {
        setSavingChoiceId(null);
      }
    },
    [refresh],
  );

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { state, savingChoiceId, message, resolve, refresh };
}
