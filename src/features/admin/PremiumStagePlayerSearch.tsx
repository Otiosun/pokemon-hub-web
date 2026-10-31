import { useEffect, useRef, useState } from 'react';

export interface SearchPlayer {
  playerId: string;
  trainerName: string | null;
  trainerLevel: number;
  status: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type SearchPhase = 'idle' | 'waiting' | 'loading' | 'ready' | 'empty' | 'error';

export async function searchPremiumStagePlayers(query: string, fetcher: typeof fetch = fetch): Promise<SearchPlayer[]> {
  const value = query.trim();
  if (value.length < 2 || value.length > 80 || value.split('').some((char) => char.charCodeAt(0) < 32)) return [];
  const response = await fetcher(`/api/hub/admin/premium/players?q=${encodeURIComponent(value)}`, {
    method: 'GET', credentials: 'include', cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Busca de treinadores indisponível.');
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('players' in body) || !Array.isArray(body.players) ||
    !body.players.every((p: unknown) => p !== null && typeof p === 'object' &&
      'playerId' in p && typeof p.playerId === 'string' && UUID.test(p.playerId) &&
      'trainerName' in p && (p.trainerName === null || typeof p.trainerName === 'string') &&
      'trainerLevel' in p && typeof p.trainerLevel === 'number' &&
      'status' in p && typeof p.status === 'string')) {
    throw new Error('Resposta inválida na busca de treinadores.');
  }
  return body.players;
}

/** Incremental results; an out-of-order older request can never replace newer results. */
export function PremiumStagePlayerSearch({
  onSelect,
  onEditing,
  disabled = false,
}: {
  onSelect: (player: SearchPlayer) => void;
  onEditing: () => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const requestVersion = useRef(0);
  const value = query.trim();

  useEffect(() => {
    const version = ++requestVersion.current;
    if (value.length < 2 || value.length > 80 || value.split('').some((char) => char.charCodeAt(0) < 32)) {
      setResults([]);
      setPhase('idle');
      return;
    }
    setPhase('waiting');
    const timer = window.setTimeout(() => {
      setPhase('loading');
      void searchPremiumStagePlayers(value)
        .then((players) => {
          if (version !== requestVersion.current) return;
          setResults(players);
          setPhase(players.length > 0 ? 'ready' : 'empty');
        })
        .catch(() => {
          if (version !== requestVersion.current) return;
          setResults([]);
          setPhase('error');
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      requestVersion.current += 1;
    };
  }, [value]);

  const message = ({
    idle: 'Digite as duas primeiras letras do nome para encontrar um treinador.',
    waiting: 'Preparando sugestões…',
    loading: 'Procurando treinadores…',
    ready: `${results.length} treinador${results.length === 1 ? '' : 'es'} encontrado${results.length === 1 ? '' : 's'}. Toque no nome para selecionar.`,
    empty: 'Nenhum nome começa assim. Experimente as primeiras letras do treinador.',
    error: 'Não foi possível pesquisar agora. Você pode usar o ID manual abaixo.',
  } as const)[phase];

  return (
    <div className="premium-stage-search">
      <label htmlFor="premium-stage-search-name">Buscar treinador</label>
      <div className="premium-search-field">
        <input
          id="premium-stage-search-name"
          type="search"
          disabled={disabled}
          inputMode="search"
          value={query}
          maxLength={80}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Comece a digitar o nome…"
          aria-describedby="premium-search-feedback"
          aria-busy={phase === 'waiting' || phase === 'loading'}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            onEditing();
          }}
        />
        <span className="premium-search-indicator" aria-hidden="true">
          {phase === 'waiting' || phase === 'loading' ? '…' : '⌕'}
        </span>
      </div>
      <p id="premium-search-feedback" role="status" className={phase === 'error' ? 'is-error' : undefined}>
        {message}
      </p>
      {phase === 'ready' && results.length > 0 ? (
        <ul aria-label="Resultados da busca de treinadores">
          {results.map((player) => (
            <li key={player.playerId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  ++requestVersion.current;
                  onSelect(player);
                  setQuery('');
                  setResults([]);
                  setPhase('idle');
                }}
              >
                <span className="premium-search-result-name">
                  <strong>{player.trainerName?.trim() || 'Treinador sem nome'}</strong>
                  <small>NV {player.trainerLevel} · {player.status === 'ACTIVE' ? 'Ativo' : player.status}</small>
                </span>
                <span className="premium-search-choose">Selecionar <span aria-hidden="true">→</span></span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
