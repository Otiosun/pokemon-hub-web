import { useCallback, useState } from 'react';
import { PokemonDetailPage } from './PokemonDetailPage';
import { getFieldDexSpecies } from './fieldDexSpecies';

function replaceRouteWithoutReload(routeSlug: string) {
  const destination = `/pokemon/${routeSlug}`;
  window.history.replaceState({}, '', destination);
  window.dispatchEvent(new PopStateEvent('popstate'));
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
    </div>
  );
}
