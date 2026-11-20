import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getPlayerPortalMoveChoices,
  resolvePlayerPortalMoveChoice,
  type PlayerPortalPendingMoveChoice,
  type PlayerPortalMoveChoiceRequest,
} from '../../player-api/playerPortalMoveChoiceClient';

type MoveChoiceState =
  | { status: 'loading' }
  | { status: 'authenticated'; blockedByBattle: boolean; choices: readonly PlayerPortalPendingMoveChoice[] }
  | { status: 'unauthenticated' } | { status: 'unavailable' };

export function usePlayerPortalMoveChoices() {
  const [state, setState] = useState<MoveChoiceState>({ status: 'loading' });
  const [savingChoiceId, setSavingChoiceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const result = await getPlayerPortalMoveChoices();
      if (generation.current === ticket) setState(result);
    } catch {
      if (generation.current === ticket) setState({ status: 'unavailable' });
    }
  }, []);
  const refresh = useCallback(async () => { if (!busy.current) await reload(); }, [reload]);
  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = useCallback(async (request: PlayerPortalMoveChoiceRequest) => {
    if (busy.current) return { status: 'busy' as const };
    busy.current = true;
    ++generation.current; // invalidate older GETs, including an outstanding focus refresh
    setSavingChoiceId(request.choiceId);
    setMessage(null);
    try {
      const result = await resolvePlayerPortalMoveChoice(request);
      if (result.status === 'unauthenticated') {
        setState({ status: 'unauthenticated' });
        return { status: 'unauthenticated' as const };
      }
      if (result.status === 'blocked') {
        setState(current => current.status === 'authenticated' ? { ...current, blockedByBattle: true } : current);
        setMessage('Alterações de golpes ficam bloqueadas durante uma batalha ativa.');
        return { status: 'blocked' as const };
      }
      if (result.status === 'stale') {
        await reload();
        setMessage('O painel mudou. Confira os golpes atuais e faça uma nova escolha.');
        return { status: 'stale' as const };
      }
      const successMessage = result.result.status === 'SKIPPED' ? 'Aprendizado ignorado. Os golpes atuais foram preservados.' : 'Novo golpe aprendido com sucesso.';
      setMessage(successMessage);
      if (result.refreshRequired === true) {
        // Do not retain a possibly stale actionable list while refreshing a committed receipt.
        setState({ status: 'loading' });
        await reload();
      } else {
        setState({ status: 'authenticated', blockedByBattle: result.blockedByBattle, choices: result.choices });
      }
      return { status: 'authenticated' as const, result: result.result };
    } catch {
      setMessage('Não foi possível confirmar o resultado. Tente novamente a mesma decisão ou atualize o painel.');
      return { status: 'unavailable' as const };
    } finally {
      busy.current = false;
      setSavingChoiceId(null);
    }
  }, [reload]);
  useEffect(() => {
    const sync = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      ++generation.current;
    };
  }, [refresh]);
  return { state, savingChoiceId, message, resolve, refresh };
}
