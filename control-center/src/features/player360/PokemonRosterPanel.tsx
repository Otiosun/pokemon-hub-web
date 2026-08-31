import type { Player360Overview, Player360PokemonView } from '../../lib/api/admin-api';

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

function optionalLabel(value: string | null): string {
  return value === null || value.length === 0 ? 'Não registrado' : humanizeSlug(value);
}

function ivLabel(value: number | null): string {
  return value === null ? '—' : String(value);
}

function PokemonCard({ pokemon }: { readonly pokemon: Player360PokemonView }) {
  const displayName = pokemon.nickname ?? humanizeSlug(pokemon.speciesSlug);
  const speciesName = humanizeSlug(pokemon.speciesSlug);
  const position =
    pokemon.placement?.kind === 'TEAM'
      ? `TIME · SLOT ${pokemon.placement.slotNo}`
      : pokemon.placement?.kind === 'BOX'
        ? `BOX ${pokemon.placement.boxNo} · SLOT ${pokemon.placement.slotNo}`
        : 'SEM SLOT';

  return (
    <details className="pokemon-roster-card">
      <summary>
        <span className="pokemon-position">{position}</span>
        <span className="pokemon-summary-main">
          <span className="pokemon-name-row">
            <strong>{displayName}</strong>
            {pokemon.nickname ? <small>{speciesName}</small> : null}
          </span>
          <span className="pokemon-dex">{dexNumber(pokemon.nationalDex)}</span>
        </span>
        <span className="pokemon-summary-stats">
          <strong>Nv. {pokemon.level}</strong>
          <span>HP atual {pokemon.currentHp}</span>
        </span>
        <span className="pokemon-summary-badges">
          {pokemon.shiny ? <span className="pokemon-badge is-shiny">SHINY</span> : null}
          {pokemon.status === 'ARCHIVED' ? (
            <span className="pokemon-badge is-archived">ARCHIVED</span>
          ) : null}
        </span>
      </summary>

      <div className="pokemon-diagnostics">
        <div className="pokemon-core-grid">
          <div>
            <small>HABILIDADE</small>
            <strong>{optionalLabel(pokemon.abilitySlug)}</strong>
          </div>
          <div>
            <small>NATUREZA</small>
            <strong>{optionalLabel(pokemon.natureSlug)}</strong>
          </div>
          <div>
            <small>GÊNERO</small>
            <strong>{optionalLabel(pokemon.gender)}</strong>
          </div>
          <div>
            <small>XP</small>
            <strong>{pokemon.xp}</strong>
          </div>
        </div>

        <section className="pokemon-detail-block" aria-label={`IVs de ${displayName}`}>
          <div className="pokemon-detail-heading">
            <strong>IVs</strong>
            <small>Valores autoritativos, sem cálculo derivado.</small>
          </div>
          <div className="pokemon-iv-grid">
            <span>HP <strong>{ivLabel(pokemon.ivs.hp)}</strong></span>
            <span>ATK <strong>{ivLabel(pokemon.ivs.attack)}</strong></span>
            <span>DEF <strong>{ivLabel(pokemon.ivs.defense)}</strong></span>
            <span>SPA <strong>{ivLabel(pokemon.ivs.spAttack)}</strong></span>
            <span>SPD <strong>{ivLabel(pokemon.ivs.spDefense)}</strong></span>
            <span>SPE <strong>{ivLabel(pokemon.ivs.speed)}</strong></span>
          </div>
        </section>

        <section className="pokemon-detail-block" aria-label={`Golpes de ${displayName}`}>
          <div className="pokemon-detail-heading">
            <strong>Golpes</strong>
            <small>{pokemon.moves.length} registrado(s)</small>
          </div>
          {pokemon.moves.length === 0 ? (
            <p className="pokemon-detail-empty">Nenhum golpe registrado.</p>
          ) : (
            <div className="pokemon-move-list">
              {[...pokemon.moves]
                .sort((left, right) => left.slotNo - right.slotNo)
                .map((move) => (
                  <div key={`${pokemon.id}:${move.slotNo}:${move.moveId}`}>
                    <span>SLOT {move.slotNo}</span>
                    <strong>{humanizeSlug(move.slug)}</strong>
                    <small>PP atual {move.ppCurrent ?? '—'}</small>
                  </div>
                ))}
            </div>
          )}
        </section>

        <div className="pokemon-condition-grid">
          <section className="pokemon-detail-block">
            <div className="pokemon-detail-heading">
              <strong>Condições persistentes</strong>
              <small>{pokemon.persistentConditions.length}</small>
            </div>
            {pokemon.persistentConditions.length === 0 ? (
              <p className="pokemon-detail-empty">Nenhuma condição persistente.</p>
            ) : (
              <ul className="pokemon-technical-list">
                {pokemon.persistentConditions.map((condition) => (
                  <li key={`${condition.key}:${condition.appliedAt}`}>
                    <strong>{condition.key}</strong>
                    <small>{condition.sourceType} · {condition.sourceId}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pokemon-detail-block">
            <div className="pokemon-detail-heading">
              <strong>Flags de evolução</strong>
              <small>{pokemon.evolutionConditionFlags.length}</small>
            </div>
            {pokemon.evolutionConditionFlags.length === 0 ? (
              <p className="pokemon-detail-empty">Nenhuma flag de evolução.</p>
            ) : (
              <ul className="pokemon-technical-list">
                {pokemon.evolutionConditionFlags.map((flag) => (
                  <li key={`${flag.key}:${flag.revision}`}>
                    <strong>{flag.key}</strong>
                    <small>{flag.status} · {flag.sourceType}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="pokemon-technical-footer">
          <code>{pokemon.id}</code>
          <span>REV {pokemon.revision}</span>
          <span>FORM {pokemon.formSlug}</span>
        </div>
      </div>
    </details>
  );
}

function RosterSection({
  label,
  note,
  pokemon,
}: {
  readonly label: string;
  readonly note: string;
  readonly pokemon: readonly Player360PokemonView[];
}) {
  return (
    <section className="pokemon-roster-section">
      <div className="pokemon-roster-section-heading">
        <div>
          <span className="panel-kicker">{label}</span>
          <small>{note}</small>
        </div>
        <span className="muted-badge">{pokemon.length}</span>
      </div>
      <div className="pokemon-roster-list">
        {pokemon.map((entry) => <PokemonCard key={entry.id} pokemon={entry} />)}
      </div>
    </section>
  );
}

export function PokemonRosterPanel({ player }: { readonly player: Player360Overview }) {
  const team = player.pokemon
    .filter((pokemon) => pokemon.status === 'ACTIVE' && pokemon.placement?.kind === 'TEAM')
    .sort((left, right) => (left.placement?.slotNo ?? 0) - (right.placement?.slotNo ?? 0));

  const boxEntries = player.pokemon.filter(
    (pokemon) => pokemon.status === 'ACTIVE' && pokemon.placement?.kind === 'BOX',
  );
  const boxNumbers = [...new Set(boxEntries.map((pokemon) => pokemon.placement?.boxNo ?? 0))]
    .filter((boxNo) => boxNo > 0)
    .sort((left, right) => left - right);

  const outsideRoster = player.pokemon
    .filter((pokemon) => pokemon.status === 'ARCHIVED' || pokemon.placement === null)
    .sort((left, right) => left.nationalDex - right.nationalDex);

  if (player.pokemon.length === 0) {
    return (
      <section className="pokemon-roster-panel pokemon-roster-empty" aria-labelledby="pokemon-roster-title">
        <span className="panel-kicker">TIME &amp; BOX</span>
        <h3 id="pokemon-roster-title">Nenhum Pokémon registrado para este jogador.</h3>
        <p>Esse é um estado válido do read model. A Central não cria placeholders de roster.</p>
      </section>
    );
  }

  return (
    <section className="pokemon-roster-panel" aria-labelledby="pokemon-roster-title">
      <div className="pokemon-roster-heading">
        <div>
          <span className="panel-kicker">TIME &amp; BOX</span>
          <h3 id="pokemon-roster-title">Roster primeiro. Diagnóstico quando necessário.</h3>
          <p>
            Posição, nível e estado ficam visíveis de imediato. Abra um Pokémon para ver moves,
            IVs, condições e flags sem alterar o domínio.
          </p>
        </div>
        <span className="muted-badge">{player.pokemon.length} POKÉMON</span>
      </div>

      <RosterSection
        label="TIME ATUAL"
        note="Ordenado pelo slot canônico do time."
        pokemon={team}
      />

      {boxNumbers.map((boxNo) => (
        <RosterSection
          key={boxNo}
          label={`BOX ${boxNo}`}
          note="Ordenado pelo slot canônico da Box."
          pokemon={boxEntries
            .filter((pokemon) => pokemon.placement?.boxNo === boxNo)
            .sort((left, right) =>
              (left.placement?.slotNo ?? 0) - (right.placement?.slotNo ?? 0)
            )}
        />
      ))}

      {outsideRoster.length > 0 ? (
        <RosterSection
          label="FORA DO ROSTER"
          note="Sem placement ativo ou arquivado no domínio."
          pokemon={outsideRoster}
        />
      ) : null}
    </section>
  );
}
