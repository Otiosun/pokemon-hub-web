import { TypeBadge } from '../../visual-assets/TypeBadge';
import { getPokemonSpeciesVisualAssets } from '../../visual-assets/pokemonVisualRegistry';
import { typeAccent } from '../pokemon-detail/fieldDexSpecies';
import { getTeamPreview } from '../collection/ownedPokemonPreview';
import './team-page.css';

export function TeamPage() {
  const team = getTeamPreview();
  const representedTypes = [...new Set(team.flatMap((pokemon) => pokemon.types))];

  return (
    <main className="team-page">
      <header className="team-header">
        <div>
          <span className="team-kicker">FORMAÇÃO ATIVA</span>
          <h1>Meu Time</h1>
          <p>Seis parceiros, leitura imediata. Edição de slots e análise mecânica entram quando o contrato real do RPG estiver conectado.</p>
        </div>
        <div className="team-readout">
          <strong>{team.length}/6</strong>
          <span>SLOTS OCUPADOS</span>
        </div>
      </header>

      <div className="team-runtime-note">
        <span aria-hidden="true" /> ESTRUTURA DE TIME · SEM MUTAÇÃO LOCAL
      </div>

      <section className="team-workbench" aria-label="Time ativo">
        <div className="team-grid">
          {team.map((pokemon) => {
            const visual = getPokemonSpeciesVisualAssets(pokemon.dex);
            return (
              <article className="team-slot" key={pokemon.instanceId}>
                <div className="team-slot-number">
                  <span>SLOT</span>
                  <strong>{String(pokemon.teamSlot ?? 0).padStart(2, '0')}</strong>
                </div>
                <div className="team-slot-visual">
                  <img
                    src={visual.icon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.hidden = true; }}
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
            <div><dt>EDIÇÃO</dt><dd>API PENDENTE</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
