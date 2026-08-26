import { useCallback, useState } from 'react';
import { PokemonDetailPage } from './PokemonDetailPage';
import {
  FIELD_DEX_REVIEW_SPECIES,
  getFieldDexSpecies,
  getFieldDexVisual,
} from './fieldDexSpecies';

function replaceRouteWithoutReload(routeSlug: string) {
  const destination = `/pokemon/${routeSlug}`;
  window.history.replaceState({}, '', destination);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function ReviewRecordRail({ activeRouteSlug }: { activeRouteSlug: string }) {
  return (
    <nav className="dex-review-rail" aria-label="Registros 3D disponíveis neste índice local">
      <span className="dex-review-rail-label">ÍNDICE LOCAL</span>
      <div className="dex-review-rail-list">
        {FIELD_DEX_REVIEW_SPECIES.map((species) => {
          const active = species.routeSlug === activeRouteSlug;
          const visual = getFieldDexVisual(species.dex);
          return (
            <a
              key={species.routeSlug}
              className={active ? 'is-active' : undefined}
              href={`/pokemon/${species.routeSlug}`}
              aria-label={`Abrir registro ${String(species.dex).padStart(3, '0')}, ${species.name}`}
              {...(active ? { 'aria-current': 'page' as const } : {})}
            >
              <img src={visual.icon} alt="" aria-hidden="true" decoding="async" />
              <span>#{String(species.dex).padStart(3, '0')}</span>
              <strong>{species.name}</strong>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export function PokemonDetailRoute({ routeSlug }: { routeSlug: string }) {
  const [committedRouteSlug, setCommittedRouteSlug] = useState(routeSlug);
  const requestedSpecies = getFieldDexSpecies(routeSlug);
  const committedSpecies = getFieldDexSpecies(committedRouteSlug);
  const pending = requestedSpecies.slug !== committedSpecies.slug;

  const handleDisplayedSpeciesChange = useCallback(
    (displayedSpeciesSlug: string) => {
      const latestRequested = getFieldDexSpecies(routeSlug);
      if (displayedSpeciesSlug !== latestRequested.slug) return;
      setCommittedRouteSlug(latestRequested.routeSlug);
    },
    [routeSlug],
  );

  const handleFailedSpeciesChange = useCallback(
    (failedSpeciesSlug: string) => {
      const latestRequested = getFieldDexSpecies(routeSlug);
      if (failedSpeciesSlug !== latestRequested.slug) return;
      replaceRouteWithoutReload(committedSpecies.routeSlug);
    },
    [committedSpecies.routeSlug, routeSlug],
  );

  return (
    <div className={`dex-route${pending ? ' is-pending' : ''}`} aria-busy={pending}>
      <PokemonDetailPage
        routeSlug={committedRouteSlug}
        viewerRouteSlug={routeSlug}
        onViewerDisplayedSpeciesChange={handleDisplayedSpeciesChange}
        onViewerFailedSpeciesChange={handleFailedSpeciesChange}
      />
      <ReviewRecordRail activeRouteSlug={committedRouteSlug} />
    </div>
  );
}
