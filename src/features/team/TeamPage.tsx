import { useMemo, useState } from 'react';
import type { PlayerPortalBrowserSessionState } from '../../player-api/playerPortalBrowserSession';
import { movePlayerPortalPokemon } from '../../player-api/playerPortalRosterClient';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { createOwnedPokemonView } from '../collection/ownedPokemonView';
import { useOwnedPokemonCollection } from '../collection/useOwnedPokemonCollection';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import './team-page.css';

type TeamPageProps = {
  playerPortalSession: PlayerPortalBrowserSessionState;
};

export function TeamPage({ playerPortalSession }: TeamPageProps) {
  const collection = useOwnedPokemonCollection();
  const [organizingSourceId, setOrganizingSourceId] = useState<string | null>(null);
  const [organizingStatus, setOrganizingStatus] = useState<'idle' | 'saving'>('idle');
  const [organizingMessage, setOrganizingMessage] = useState<string | null>(null);
  const team = useMemo(
    () =>
      collection.status === 'authenticated'
        ? createOwnedPokemonView(collection.pokemon)
            .filter((pokemon) => pokemon.teamSlot !== null)
            .sort((left, right) => (left.teamSlot ?? 99) - (right.teamSlot ?? 99))
        : [],
    [collection],
  );
  const teamBySlot = useMemo(
    () => new Map(team.map((pokemon) => [pokemon.teamSlot, pokemon] as const)),
    [team],
  );
  const representedTypes = [...new Set(team.flatMap((pokemon) => pokemon.types))];
  const freeSlots = Math.max(0, 6 - team.length);
  const organizingSource =
    organizingSourceId === null
      ? null
      : team.find((pokemon) => pokemon.instanceId === organizingSourceId) ?? null;

  const sessionCopy =
    collection.status === 'authenticated'
      ? team.length > 0
        ? 'Formação sincronizada com o registro oficial. Organize os seis slots aqui ou abra qualquer parceiro para consultar o registro individual.'
        : 'Nenhum Pokémon está equipado no time ativo deste treinador.'
      : collection.status === 'loading' || playerPortalSession.status === 'loading'
        ? 'Sincronizando a formação oficial do treinador.'
        : 'O time oficial não está disponível nesta sessão.';

  const chooseRosterSlot = async (slotNo: number) => {
    const occupant = teamBySlot.get(slotNo) ?? null;
    if (organizingSource === null) {
      if (occupant !== null) {
        setOrganizingSourceId(occupant.instanceId);
        setOrganizingMessage(`${occupant.nickname} selecionado. Escolha o slot de destino.`);
      }
      return;
    }

    if (organizingSource.teamSlot === slotNo) {
      setOrganizingSourceId(null);
      setOrganizingMessage(null);
      return;
    }

    setOrganizingStatus('saving');
    setOrganizingMessage(null);
    try {
      const result = await movePlayerPortalPokemon({
        pokemonInstanceId: organizingSource.instanceId,
        target: { placementKind: 'TEAM', boxNo: null, slotNo },
      });
      if (result.status === 'unauthenticated') {
        setOrganizingMessage('Sua sessão expirou. Abra o Hub novamente pelo bot.');
        return;
      }
      collection.replacePokemon(result.pokemon);
      setOrganizingSourceId(null);
      setOrganizingMessage(
        occupant
          ? `${organizingSource.nickname} e ${occupant.nickname} trocaram de posição.`
          : `${organizingSource.nickname} foi movido para o slot ${slotNo}.`,
      );
    } catch {
      setOrganizingMessage('Não foi possível reorganizar o Time agora.');
    } finally {
      setOrganizingStatus('idle');
    }
  };

  return (
    <main className="team-page">
      <HubModuleHeader module="team" metaLabel="FORMAÇÃO" metaValue={`${team.length} / 6`} />

      <div className="team-page-content">
        <header className="team-header">
          <div>
            <span className="team-kicker">
              {collection.status === 'authenticated'
                ? 'FORMAÇÃO ATIVA'
                : collection.status === 'loading'
                  ? 'CARREGANDO TIME'
                  : 'TIME INDISPONÍVEL'}
            </span>
            <h1>Meu Time</h1>
            <p>{sessionCopy}</p>
          </div>
          <div className="team-readout">
            <strong>{team.length}/6</strong>
            <span>SLOTS OCUPADOS</span>
          </div>
        </header>

        <section className="team-organizer" aria-label="Organizar formação">
          <div className="team-organizer-copy">
            <span>ORGANIZAR FORMAÇÃO</span>
            <strong>
              {organizingSource
                ? `Mover ${organizingSource.nickname}`
                : 'Selecione um Pokémon e depois o destino'}
            </strong>
            <small>
              Slots ocupados fazem troca automática. Nenhum dado é alterado até você escolher o destino.
            </small>
          </div>

          <div className="team-organizer-slots">
            {[1, 2, 3, 4, 5, 6].map((slotNo) => {
              const occupant = teamBySlot.get(slotNo) ?? null;
              const selected = occupant?.instanceId === organizingSourceId;
              return (
                <button
                  key={slotNo}
                  type="button"
                  className={selected ? 'is-selected' : undefined}
                  disabled={organizingStatus === 'saving' || (organizingSource === null && occupant === null)}
                  aria-pressed={selected}
                  onClick={() => void chooseRosterSlot(slotNo)}
                >
                  <span>{String(slotNo).padStart(2, '0')}</span>
                  {occupant ? (
                    <>
                      {occupant.dex !== null ? (
                        <OwnedPokemonImage
                          dex={occupant.dex}
                          assetRole="portrait"
                          shiny={occupant.shiny}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <strong aria-hidden="true">?</strong>
                      )}
                      <strong>{occupant.nickname}</strong>
                    </>
                  ) : (
                    <strong>VAZIO</strong>
                  )}
                </button>
              );
            })}
          </div>

          {organizingMessage ? <p role="status">{organizingMessage}</p> : null}
        </section>

        <section className="team-workbench" aria-label="Time ativo">
          <div className="team-grid">
            {team.map((pokemon) => (
              <article className="team-slot" key={pokemon.instanceId}>
                <div className="team-slot-number">
                  <span>SLOT</span>
                  <strong>{String(pokemon.teamSlot).padStart(2, '0')}</strong>
                </div>

                <a
                  className="team-slot-open"
                  href={`/pokemon/${pokemon.instanceId}`}
                  aria-label={`Abrir registro de ${pokemon.nickname}`}
                >
                  <div className="team-slot-visual">
                    {pokemon.dex !== null ? (
                      <OwnedPokemonImage
                        dex={pokemon.dex}
                        assetRole="portrait"
                        shiny={pokemon.shiny}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        fallbackLabel="?"
                      />
                    ) : (
                      <strong aria-hidden="true">?</strong>
                    )}
                  </div>
                  <div className="team-slot-main">
                    <div className="team-slot-heading">
                      <div>
                        <strong>{pokemon.nickname}</strong>
                        <span>
                          {pokemon.dex !== null
                            ? `#${String(pokemon.dex).padStart(3, '0')}`
                            : 'CATÁLOGO INDISPONÍVEL'}
                        </span>
                      </div>
                      <em>NV. {pokemon.level}</em>
                    </div>
                    <div className="team-slot-types">
                      {pokemon.types.map((type) => (
                        <TypeBadge key={type} type={type} accent={typeAccent(type)} compact />
                      ))}
                    </div>
                    <div className="team-slot-status">
                      <span>
                        <i aria-hidden="true" /> ATIVO
                      </span>
                      <strong>HP {pokemon.currentHp}</strong>
                    </div>
                  </div>
                </a>
              </article>
            ))}
          </div>

          <aside className="team-analysis" aria-label="Leitura do conjunto">
            <div className="team-analysis-head">
              <span>LEITURA DO CONJUNTO</span>
              <strong>Composição</strong>
            </div>
            <p>
              Leitura direta da formação oficial, com ocupação dos slots e tipos realmente
              registrados no time.
            </p>
            <div className="team-type-cloud">
              {representedTypes.map((type) => (
                <TypeBadge key={type} type={type} accent={typeAccent(type)} />
              ))}
            </div>
            <dl className="team-analysis-facts">
              <div>
                <dt>MEMBROS</dt>
                <dd>{team.length}</dd>
              </div>
              <div>
                <dt>TIPOS PRESENTES</dt>
                <dd>{representedTypes.length}</dd>
              </div>
              <div>
                <dt>SLOTS LIVRES</dt>
                <dd>{freeSlots}</dd>
              </div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
