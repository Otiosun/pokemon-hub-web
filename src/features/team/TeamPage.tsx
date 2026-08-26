import { useMemo, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { getTeamPreview, OWNED_POKEMON_PREVIEW } from '../collection/ownedPokemonPreview';
import './team-page.css';
import './team-picker.css';

export function TeamPage() {
  const team = getTeamPreview();
  const representedTypes = [...new Set(team.flatMap((pokemon) => pokemon.types))];
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const storageCandidates = useMemo(
    () => OWNED_POKEMON_PREVIEW.filter((pokemon) => pokemon.teamSlot === null),
    [],
  );
  const candidate = candidateId
    ? storageCandidates.find((pokemon) => pokemon.instanceId === candidateId) ?? null
    : null;
  const editingPokemon = editingSlot
    ? team.find((pokemon) => pokemon.teamSlot === editingSlot) ?? null
    : null;

  const openPicker = (slot: number) => {
    setEditingSlot(slot);
    setCandidateId(null);
  };

  const closePicker = () => {
    setEditingSlot(null);
    setCandidateId(null);
  };

  return (
    <main className="team-page">
      <header className="team-header">
        <div>
          <span className="team-kicker">FORMAÇÃO ATIVA</span>
          <h1>Meu Time</h1>
          <p>Seis parceiros, leitura imediata. Trocas podem ser preparadas aqui; a mutação real só será confirmada pela API do RPG.</p>
        </div>
        <div className="team-readout">
          <strong>{team.length}/6</strong>
          <span>SLOTS OCUPADOS</span>
        </div>
      </header>

      <div className="team-runtime-note">
        <span aria-hidden="true" /> ESTRUTURA DE TIME · TROCA EM PRÉVIA · SEM MUTAÇÃO LOCAL
      </div>

      <section className="team-workbench" aria-label="Time ativo">
        <div className="team-grid">
          {team.map((pokemon) => (
            <article className={`team-slot${editingSlot === pokemon.teamSlot ? ' is-editing' : ''}`} key={pokemon.instanceId}>
              <div className="team-slot-number">
                <span>SLOT</span>
                <strong>{String(pokemon.teamSlot ?? 0).padStart(2, '0')}</strong>
              </div>
              <a className="team-slot-open" href={`/pokemon/${pokemon.instanceId}`} aria-label={`Abrir build de ${pokemon.nickname}`}>
                <div className="team-slot-visual">
                  <PokemonAssetImage
                    dex={pokemon.dex}
                    role="icon"
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    fallbackLabel="?"
                  />
                </div>
                <div className="team-slot-main">
                  <div className="team-slot-heading">
                    <div>
                      <strong>{pokemon.nickname}</strong>
                      <span>{pokemon.species}</span>
                    </div>
                    <em>NV. {pokemon.level}</em>
                  </div>
                  <div className="team-slot-types">
                    {pokemon.types.map((type) => (
                      <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
                    ))}
                  </div>
                  <div className="team-slot-status">
                    <span><i aria-hidden="true" /> PRONTO</span>
                    {pokemon.shiny && <strong>SHINY</strong>}
                  </div>
                </div>
              </a>
              <button
                className="team-slot-swap"
                type="button"
                onClick={() => openPicker(pokemon.teamSlot ?? 1)}
                aria-expanded={editingSlot === pokemon.teamSlot}
              >
                TROCAR
              </button>
            </article>
          ))}
        </div>

        <aside className="team-analysis" aria-label="Leitura do conjunto">
          <div className="team-analysis-head">
            <span>LEITURA DO CONJUNTO</span>
            <strong>Composição</strong>
          </div>
          <p>
            Esta camada mostra apenas informações observáveis da formação atual. Fraquezas, resistências e cobertura ofensiva só serão calculadas pelas regras reais do RPG.
          </p>
          <div className="team-type-cloud">
            {representedTypes.map((type) => (
              <TypeBadge key={type} type={type} accent={typeAccent(type)} />
            ))}
          </div>
          <dl className="team-analysis-facts">
            <div><dt>MEMBROS</dt><dd>{team.length}</dd></div>
            <div><dt>TIPOS PRESENTES</dt><dd>{representedTypes.length}</dd></div>
            <div><dt>EDIÇÃO</dt><dd>API PENDENTE</dd></div>
          </dl>
        </aside>
      </section>

      {editingSlot && editingPokemon && (
        <section className="team-picker" aria-label={`Substituir membro do slot ${editingSlot}`}>
          <header className="team-picker-head">
            <div>
              <span>SUBSTITUIR SLOT {String(editingSlot).padStart(2, '0')}</span>
              <strong>{editingPokemon.nickname}</strong>
            </div>
            <button type="button" onClick={closePicker}>FECHAR</button>
          </header>

          <div className="team-picker-candidates" role="list" aria-label="Pokémon disponíveis fora do Time">
            {storageCandidates.map((pokemon) => (
              <button
                type="button"
                role="listitem"
                key={pokemon.instanceId}
                className={candidateId === pokemon.instanceId ? 'is-selected' : undefined}
                onClick={() => setCandidateId(pokemon.instanceId)}
              >
                <PokemonAssetImage dex={pokemon.dex} role="icon" alt="" aria-hidden="true" loading="lazy" fallbackLabel="?" />
                <span><strong>{pokemon.nickname}</strong><small>NV. {pokemon.level} · {pokemon.box}</small></span>
                <span className="team-picker-types">
                  {pokemon.types.map((type) => <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />)}
                </span>
              </button>
            ))}
          </div>

          <div className={`team-swap-preview${candidate ? ' is-ready' : ''}`}>
            {candidate ? (
              <>
                <div><span>SAI</span><strong>{editingPokemon.nickname}</strong></div>
                <span aria-hidden="true">→</span>
                <div><span>ENTRA</span><strong>{candidate.nickname}</strong></div>
                <button type="button" disabled title="Requer API do RPG">APLICAR COM API</button>
              </>
            ) : (
              <p>Escolha um Pokémon armazenado para visualizar a troca. Nenhuma mudança é aplicada localmente.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
