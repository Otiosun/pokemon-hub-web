import { useMemo } from 'react';
import { HubModuleHeader } from '../../components/HubModuleHeader';
import { PokemonAssetImage } from '../../visual-assets/PokemonAssetImage';
import { TypeBadge } from '../../visual-assets/TypeBadge';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { getTeamPreview } from '../collection/ownedPokemonPreview';
import './team-page.css';

export function TeamPage() {
  const team = useMemo(getTeamPreview, []);
  const representedTypes = [...new Set(team.flatMap((pokemon) => pokemon.types))];
  const favoriteCount = team.filter((pokemon) => pokemon.favorite).length;

  return (
    <main className="team-page">
      <HubModuleHeader module="team" metaLabel="FORMAÇÃO" metaValue={`${team.length} / 6`} />

      <div className="team-page-content">
        <header className="team-header">
          <div>
            <span className="team-kicker">FORMAÇÃO ATIVA</span>
            <h1>Meu Time</h1>
            <p>Seus seis parceiros ativos ficam reunidos aqui. Abra qualquer um deles para consultar o registro individual.</p>
          </div>
          <div className="team-readout">
            <strong>{team.length}/6</strong>
            <span>SLOTS OCUPADOS</span>
          </div>
        </header>

        <section className="team-workbench" aria-label="Time ativo">
          <div className="team-grid">
            {team.map((pokemon, index) => {
              const displaySlot = index + 1;
              return (
                <article className="team-slot" key={pokemon.instanceId}>
                  <div className="team-slot-number">
                    <span>SLOT</span>
                    <strong>{String(displaySlot).padStart(2, '0')}</strong>
                  </div>

                  <a
                    className="team-slot-open"
                    href={`/pokemon/${pokemon.instanceId}`}
                    aria-label={`Abrir registro de ${pokemon.nickname}`}
                  >
                    <div className="team-slot-visual">
                      <PokemonAssetImage
                        dex={pokemon.dex}
                        assetRole="portrait"
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
                        <span><i aria-hidden="true" /> ATIVO</span>
                        {pokemon.favorite ? <strong>★ FAVORITO</strong> : null}
                        {pokemon.shiny ? <strong>SHINY</strong> : null}
                      </div>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>

          <aside className="team-analysis" aria-label="Leitura do conjunto">
            <div className="team-analysis-head">
              <span>LEITURA DO CONJUNTO</span>
              <strong>Composição</strong>
            </div>
            <p>Uma leitura direta da formação ativa, com os tipos representados e os parceiros marcados como favoritos.</p>
            <div className="team-type-cloud">
              {representedTypes.map((type) => (
                <TypeBadge key={type} type={type} accent={typeAccent(type)} />
              ))}
            </div>
            <dl className="team-analysis-facts">
              <div><dt>MEMBROS</dt><dd>{team.length}</dd></div>
              <div><dt>TIPOS PRESENTES</dt><dd>{representedTypes.length}</dd></div>
              <div><dt>FAVORITOS</dt><dd>{favoriteCount}</dd></div>
            </dl>
          </aside>
        </section>
      </div>
    </main>
  );
}
