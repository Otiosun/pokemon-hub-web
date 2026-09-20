import type { PlayerPortalBrowserSessionState } from '../../player-api/playerPortalBrowserSession';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { OwnedPokemonImage } from '../../visual-assets/PokemonPreviewImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { createTeamProfileView } from './teamProfileView';
import './team-page.css';

type TeamPageProps = {
  playerPortalSession: PlayerPortalBrowserSessionState;
};

export function TeamPage({ playerPortalSession }: TeamPageProps) {
  const profile =
    playerPortalSession.status === 'authenticated' ? playerPortalSession.profile : null;
  const team = createTeamProfileView(profile);
  const representedTypes = [...new Set(team.flatMap((pokemon) => pokemon.types))];
  const freeSlots = Math.max(0, 6 - team.length);

  const sessionCopy =
    playerPortalSession.status === 'authenticated'
      ? team.length > 0
        ? 'Formação sincronizada com o registro oficial do treinador. Abra qualquer parceiro para consultar o registro individual.'
        : 'Nenhum Pokémon está equipado no time ativo deste treinador.'
      : playerPortalSession.status === 'loading'
        ? 'Sincronizando a formação oficial do treinador.'
        : 'O time oficial não está disponível nesta sessão.';

  return (
    <main className="team-page">
      <HubModuleHeader module="team" metaLabel="FORMAÇÃO" metaValue={`${team.length} / 6`} />

      <div className="team-page-content">
        <header className="team-header">
          <div>
            <span className="team-kicker">
              {playerPortalSession.status === 'authenticated'
                ? 'FORMAÇÃO ATIVA'
                : playerPortalSession.status === 'loading'
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

        <section className="team-workbench" aria-label="Time ativo">
          <div className="team-grid">
            {team.map((pokemon) => (
              <article className="team-slot" key={pokemon.instanceId}>
                <div className="team-slot-number">
                  <span>SLOT</span>
                  <strong>{String(pokemon.slotNo).padStart(2, '0')}</strong>
                </div>

                <a
                  className="team-slot-open"
                  href={`/pokemon/${pokemon.instanceId}`}
                  aria-label={`Abrir registro de ${pokemon.displayName}`}
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
                        <strong>{pokemon.displayName}</strong>
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
