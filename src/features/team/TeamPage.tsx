import { useMemo, useState } from 'react';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { getTeamPreview, OWNED_POKEMON_PREVIEW, type OwnedPokemonPreview } from '../collection/ownedPokemonPreview';
import { clearTeamDraftOrder, readTeamDraftOrder, rememberTeamDraftOrder } from './teamSession';
import './team-page.css';
import './team-picker.css';

function resolveDraftTeam(
  canonicalTeam: readonly OwnedPokemonPreview[],
  draftOrder: readonly string[] | null,
) {
  if (!draftOrder) return [...canonicalTeam];
  const byId = new Map(canonicalTeam.map((pokemon) => [pokemon.instanceId, pokemon]));
  const ordered = draftOrder
    .map((instanceId) => byId.get(instanceId))
    .filter((pokemon): pokemon is OwnedPokemonPreview => Boolean(pokemon));
  return ordered.length === canonicalTeam.length ? ordered : [...canonicalTeam];
}

export function TeamPage() {
  const canonicalTeam = useMemo(() => getTeamPreview(), []);
  const [draftOrder, setDraftOrder] = useState<string[] | null>(readTeamDraftOrder);
  const team = useMemo(() => resolveDraftTeam(canonicalTeam, draftOrder), [canonicalTeam, draftOrder]);
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
  const editingPokemon = editingSlot ? team[editingSlot - 1] ?? null : null;
  const orderIsDraft = Boolean(draftOrder);

  const openPicker = (slot: number) => {
    setEditingSlot(slot);
    setCandidateId(null);
  };

  const closePicker = () => {
    setEditingSlot(null);
    setCandidateId(null);
  };

  const moveMember = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= team.length) return;

    const nextOrder = team.map((pokemon) => pokemon.instanceId);
    const currentId = nextOrder[index];
    const targetId = nextOrder[targetIndex];
    if (!currentId || !targetId) return;
    nextOrder[index] = targetId;
    nextOrder[targetIndex] = currentId;
    rememberTeamDraftOrder(nextOrder);
    setDraftOrder(nextOrder);
    closePicker();
  };

  const discardOrder = () => {
    clearTeamDraftOrder();
    setDraftOrder(null);
    closePicker();
  };

  return (
    <main className="team-page">
      <header className="team-header">
        <div>
          <span className="team-kicker">FORMAÇÃO ATIVA</span>
          <h1>Meu Time</h1>
          <p>Seis parceiros, leitura imediata. Trocas e ordem podem ser preparadas aqui; a mutação real só será confirmada pela API do RPG.</p>
        </div>
        <div className="team-readout">
          <strong>{team.length}/6</strong>
          <span>SLOTS OCUPADOS</span>
        </div>
      </header>

      <div className="team-runtime-note">
        <span aria-hidden="true" /> {orderIsDraft ? 'ORDEM EM PRÉVIA · ' : ''}TROCA EM PRÉVIA · SEM MUTAÇÃO LOCAL
      </div>

      {orderIsDraft && (
        <section className="team-order-preview" aria-label="Ordem do Time em prévia">
          <div>
            <span>ORDEM NÃO SALVA</span>
            <strong>A formação abaixo é apenas uma prévia local.</strong>
          </div>
          <div>
            <button type="button" onClick={discardOrder}>DESCARTAR</button>
            <button type="button" disabled title="Requer API do RPG">SALVAR COM API</button>
          </div>
        </section>
      )}

      <section className="team-workbench" aria-label="Time ativo">
        <div className="team-grid">
          {team.map((pokemon, index) => {
            const displaySlot = index + 1;
            return (
              <article className={`team-slot${editingSlot === displaySlot ? ' is-editing' : ''}${orderIsDraft ? ' is-order-preview' : ''}`} key={pokemon.instanceId}>
                <div className="team-slot-number">
                  <span>{orderIsDraft ? 'PRÉVIA' : 'SLOT'}</span>
                  <strong>{String(displaySlot).padStart(2, '0')}</strong>
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
                      <span><i aria-hidden="true" /> {orderIsDraft ? 'PRÉVIA' : 'PRONTO'}</span>
                      {pokemon.shiny && <strong>SHINY</strong>}
                    </div>
                  </div>
                </a>

                <div className="team-slot-controls" aria-label={`Controles de ${pokemon.nickname}`}>
                  <div className="team-slot-order-controls" aria-label="Alterar ordem">
                    <button
                      type="button"
                      onClick={() => moveMember(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${pokemon.nickname} para cima`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMember(index, 1)}
                      disabled={index === team.length - 1}
                      aria-label={`Mover ${pokemon.nickname} para baixo`}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    className="team-slot-swap"
                    type="button"
                    onClick={() => openPicker(displaySlot)}
                    aria-expanded={editingSlot === displaySlot}
                  >
                    TROCAR
                  </button>
                </div>
              </article>
            );
          })}
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
            <div><dt>EDIÇÃO</dt><dd>{orderIsDraft ? 'PRÉVIA LOCAL' : 'API PENDENTE'}</dd></div>
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
