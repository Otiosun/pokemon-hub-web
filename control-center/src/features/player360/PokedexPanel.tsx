import type { Player360Overview } from '../../lib/api/admin-api';
import { type Player360PokedexView, parsePlayer360Pokedex } from './player360-pokedex';

function humanizeSlug(value: string): string {
  return value
    .split(/[-_:]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dexNumber(value: number): string {
  return `#${String(value).padStart(3, '0')}`;
}

function formatInteger(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function timelineValue(value: string | null): string {
  return value ?? '—';
}

export function PokedexPanel({ player }: { readonly player: Player360Overview }) {
  let pokedex: Player360PokedexView;
  try {
    pokedex = parsePlayer360Pokedex(player);
  } catch {
    return (
      <section className="pokedex-panel" role="alert">
        <span className="panel-kicker">POKÉDEX</span>
        <h3>Dados de Pokédex incompatíveis com o contrato atual.</h3>
        <p className="pokedex-empty">
          A Central bloqueou esta leitura para não apresentar histórico não validado.
        </p>
      </section>
    );
  }

  const entries = [...pokedex.entries].sort((left, right) => left.nationalDex - right.nationalDex);

  return (
    <section className="pokedex-panel" aria-labelledby="pokedex-title">
      <div className="pokedex-heading">
        <div>
          <span className="panel-kicker">POKÉDEX</span>
          <h3 id="pokedex-title">Registro de descoberta e captura.</h3>
          <p>Resumo operacional do read model. Sem catálogo público, sprites ou edição nesta etapa.</p>
        </div>
        <span className="muted-badge">READ-ONLY</span>
      </div>

      <div className="pokedex-metrics" aria-label="Resumo da Pokédex">
        <article>
          <strong>{pokedex.speciesSeen}</strong>
          <span>{pokedex.speciesSeen === 1 ? 'ESPÉCIE VISTA' : 'ESPÉCIES VISTAS'}</span>
        </article>
        <article>
          <strong>{pokedex.speciesCaught}</strong>
          <span>{pokedex.speciesCaught === 1 ? 'ESPÉCIE CAPTURADA' : 'ESPÉCIES CAPTURADAS'}</span>
        </article>
      </div>

      {entries.length === 0 ? (
        <p className="pokedex-empty">Nenhum registro de Pokédex para este jogador.</p>
      ) : (
        <div className="pokedex-list">
          {entries.map((entry) => {
            const caught = entry.caughtCount !== '0';
            return (
              <details className="pokedex-entry" key={entry.speciesId}>
                <summary>
                  <span className="pokedex-dex">{dexNumber(entry.nationalDex)}</span>
                  <strong>{humanizeSlug(entry.slug)}</strong>
                  <span className={`pokedex-state ${caught ? 'is-caught' : ''}`}>
                    {caught ? 'CAPTURADO' : 'VISTO'}
                  </span>
                  <span className="pokedex-counts">
                    {formatInteger(entry.seenCount)} vistos · {formatInteger(entry.caughtCount)} capturados
                  </span>
                </summary>

                <dl className="pokedex-timeline">
                  <div>
                    <dt>Primeiro encontro</dt>
                    <dd>{timelineValue(entry.firstSeenAt)}</dd>
                  </div>
                  <div>
                    <dt>Último encontro</dt>
                    <dd>{timelineValue(entry.lastSeenAt)}</dd>
                  </div>
                  <div>
                    <dt>Primeira captura</dt>
                    <dd>{timelineValue(entry.firstCaughtAt)}</dd>
                  </div>
                  <div>
                    <dt>Última captura</dt>
                    <dd>{timelineValue(entry.lastCaughtAt)}</dd>
                  </div>
                </dl>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
