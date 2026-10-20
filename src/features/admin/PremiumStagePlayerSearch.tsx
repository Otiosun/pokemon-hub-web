import { useState } from 'react';

interface SearchPlayer { playerId: string; trainerName: string | null; trainerLevel: number; status: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function searchPremiumStagePlayers(query: string, fetcher: typeof fetch = fetch): Promise<SearchPlayer[]> {
  const value = query.trim();
  if (value.length < 2 || value.length > 80 || value.split('').some((char) => char.charCodeAt(0) < 32)) return [];
  const response = await fetcher(`/api/hub/admin/premium/players?q=${encodeURIComponent(value)}`, {
    method: 'GET', credentials: 'include', cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Busca de treinadores indisponível no staging.');
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

export function PremiumStagePlayerSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchPlayer[]>([]);
  const [message, setMessage] = useState('');
  const search = async () => {
    if (busy || query.trim().length < 2) return;
    setBusy(true);
    setMessage('');
    try {
      const entries = await searchPremiumStagePlayers(query);
      setResults(entries);
      if (entries.length === 0) setMessage('Nenhum treinador encontrado no staging.');
    } catch {
      setResults([]);
      setMessage('Busca indisponível; você ainda pode informar o Player ID manualmente.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="premium-stage-search">
      <form onSubmit={(event) => { event.preventDefault(); void search(); }}>
        <label htmlFor="premium-stage-search-name">BUSCAR POR NOME DE TREINADOR</label>
        <div>
          <input id="premium-stage-search-name" value={query} maxLength={80} autoComplete="off"
            placeholder="Digite pelo menos duas letras"
            onChange={(event) => { setQuery(event.target.value); setResults([]); }} />
          <button type="submit" disabled={busy || query.trim().length < 2}>
            {busy ? 'BUSCANDO…' : 'BUSCAR'}
          </button>
        </div>
      </form>
      {message ? <p role="status">{message}</p> : null}
      {results.length > 0 ? (
        <ul aria-label="Treinadores encontrados no staging">
          {results.map((p) => <li key={p.playerId}>
            <button type="button" onClick={() => { onSelect(p.playerId); setResults([]); setMessage('Treinador selecionado.'); }}>
              <strong>{p.trainerName ?? 'Treinador sem nome'}</strong>
              <small>NV {p.trainerLevel} · {p.status} · {p.playerId.slice(0, 8)}…</small>
            </button>
          </li>)}
        </ul>
      ) : null}
    </div>
  );
}
