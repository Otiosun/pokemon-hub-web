import { lazy, startTransition, Suspense, type ReactNode, useEffect, useState } from 'react';
import { HubNavigation } from './components/HubNavigation';
import { HubModuleHeader } from './components/HubModuleHeader';
import { rememberPokedexIndexScroll } from './features/pokedex/pokedexIndexSession';
import {
  hubSectionForPath,
  readHubDestinations,
  rememberHubDestination,
  shouldTraverseBackForUp,
  type HubDestinations,
  type HubSection,
} from './navigation/hubNavigationSession';
import { resolveProductRoute } from './navigation/productIntegrity';
import { preloadProductRoute } from './navigation/productRoutePreload';
import { usePlayerPortalBrowserSession } from './player-api/playerPortalBrowserSession';
import './hub-route-fallback-v3.css';

const JourneyPage = lazy(() =>
  import('./features/journey/JourneyPage').then((module) => ({ default: module.JourneyPage })),
);
const PokedexIndexPage = lazy(() =>
  import('./features/pokedex/PokedexIndexPage').then((module) => ({ default: module.PokedexIndexPage })),
);
const PokedexSpeciesPage = lazy(() =>
  import('./features/pokedex/PokedexSpeciesPage').then((module) => ({ default: module.PokedexSpeciesPage })),
);
const OwnedPokemonCollectionPage = lazy(() =>
  import('./features/collection/OwnedPokemonCollectionPage').then((module) => ({ default: module.OwnedPokemonCollectionPage })),
);
const OwnedPokemonDetailPage = lazy(() =>
  import('./features/collection/OwnedPokemonDetailPage').then((module) => ({ default: module.OwnedPokemonDetailPage })),
);
const TeamPage = lazy(() =>
  import('./features/team/TeamPage').then((module) => ({ default: module.TeamPage })),
);


type ChampionStoreOffer = {
  code: string;
  title: string;
  price: string;
  category: string;
  summary: string;
  bullets?: readonly string[];
  variants?: readonly { label: string; price: string; description: string }[];
  duration?: string;
};

const CHAMPION_STORE_OFFERS: readonly ChampionStoreOffer[] = [
  {
    code: 'TERA',
    title: 'Terastalização',
    price: '50,00 
const SECTION_ROOTS: Record<HubSection, string> = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
  store: '/champion-store',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
  hubParentInHistory?: boolean;
};

type FallbackModule = 'journey' | 'pokedex' | 'box';

const FALLBACK_LABELS: Record<FallbackModule, string> = {
  journey: 'JORNADA',
  pokedex: 'POKÉDEX',
  box: 'BOX',
};

function HubFrame({
  active,
  destinations,
  children,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
}) {
  return (
    <HubNavigation active={active} destinations={destinations}>
      {children}
    </HubNavigation>
  );
}

function RouteFallback({ label, module }: { label: string; module: FallbackModule }) {
  return (
    <section
      className="hub-route-fallback"
      data-hub-fallback={module}
      aria-busy="true"
      aria-label={label}
    >
      <div className="hub-route-fallback-head">
        <span className="hub-route-fallback-lens" aria-hidden="true" />
        <span>
          <strong>{FALLBACK_LABELS[module]}</strong>
          <small>{label}</small>
        </span>
      </div>
      <div className="hub-route-fallback-body" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ProductNotFound({ destinations }: { destinations: HubDestinations }) {
  return (
    <HubFrame active={null} destinations={destinations}>
      <section className="hub-route-fallback hub-product-not-found" data-hub-fallback="journey">
        <div className="hub-route-fallback-head">
          <span className="hub-route-fallback-lens" aria-hidden="true" />
          <span>
            <strong>POKÉMON HUB</strong>
            <small>ENDEREÇO INDISPONÍVEL</small>
          </span>
        </div>
        <div className="hub-product-not-found-body">
          <p>Este endereço não faz parte da versão atual do Hub.</p>
          <a href="/jornada">VOLTAR À JORNADA</a>
        </div>
      </section>
    </HubFrame>
  );
}

function getPath() {
  const rawPath = window.location.pathname === '/' ? '/jornada' : window.location.pathname;
  const resolution = resolveProductRoute(rawPath);
  if (resolution.kind === 'redirect') {
    const nextLocation = `${resolution.to}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    return resolution.to;
  }
  return rawPath;
}

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

function isOwnedPokemonInstancePath(path: string) {
  return path.startsWith('/pokemon/') && resolveProductRoute(path).kind === 'route';
}

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  return Number.parseInt(raw, 10);
}

function resetRecordViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function isRecordPath(path: string) {
  return path.startsWith('/pokemon/') || path.startsWith('/pokedex/');
}

function isPokedexIndexPath(path: string) {
  return path === '/pokedex' || path === '/pokedex/';
}

function usesSiblingHistoryReplacement(anchor: HTMLAnchorElement) {
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav, .owned-pokemon-side-nav'));
}

function explicitParentForNavigation(anchor: HTMLAnchorElement) {
  const raw = anchor.dataset.hubParent;
  if (!raw?.startsWith('/')) return undefined;
  const parent = new URL(raw, window.location.origin);
  if (parent.origin !== window.location.origin) return undefined;
  return `${parent.pathname}${parent.search}${parent.hash}`;
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, currentSearch: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  const currentRoot = rootForPath(currentPath);
  const normalizedCurrent = currentPath.replace(/\/$/, '');

  if (
    isOwnedPokemonInstancePath(destinationPath) &&
    currentSection === 'box' &&
    (normalizedCurrent === '/pokemon' || normalizedCurrent === '/team')
  ) {
    return `${normalizedCurrent}${currentSearch}`;
  }

  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (currentRoot === normalizedCurrent) {
    return `${normalizedCurrent}${currentSearch}`;
  }
  return undefined;
}

function stateForPrimaryDestination(destinationPath: string): HubHistoryState {
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection) return {};
  const destinationRoot = SECTION_ROOTS[destinationSection];
  const isRoot = destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`;
  return {
    hubSection: destinationSection,
    ...(!isRoot ? { hubParent: destinationRoot } : {}),
  };
}

function warmAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const pending = preloadProductRoute(destination.pathname);
  if (pending) void pending.catch(() => undefined);
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);
  const playerPortalSession = usePlayerPortalBrowserSession();

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ hubSection: 'journey' } satisfies HubHistoryState, '', '/jornada');
    }

    const initialSection = hubSectionForPath(window.location.pathname);
    const existing = (window.history.state ?? {}) as HubHistoryState;
    if (initialSection && !existing.hubSection) {
      const root = SECTION_ROOTS[initialSection];
      const currentPath = window.location.pathname;
      const isRoot = currentPath === root || currentPath === `${root}/`;
      window.history.replaceState(
        {
          ...existing,
          hubSection: initialSection,
          ...(!isRoot ? { hubParent: root } : {}),
        },
        '',
        window.location.href,
      );
    }
    setHubDestinations(rememberHubDestination(getHubLocation()));
  }, []);

  useEffect(() => {
    if (isRecordPath(path)) {
      resetRecordViewport();
    } else if (!isPokedexIndexPath(path)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      const remembered = rememberHubDestination(getHubLocation());
      startTransition(() => {
        setPath(nextPath);
        setHubDestinations(remembered);
      });
    };

    const onDocumentPreloadIntent = (event: Event) => {
      warmAnchorTarget(event.target);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const resolution = resolveProductRoute(destination.pathname);
      if (resolution.kind === 'redirect') {
        destination.pathname = resolution.to;
      }

      const currentPath = window.location.pathname;
      const sameDocumentHash =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        Boolean(destination.hash) &&
        destination.hash !== window.location.hash;
      if (sameDocumentHash) return;

      const sameDestination =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash;

      if (sameDestination) {
        event.preventDefault();
        return;
      }

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const historyState = (window.history.state ?? {}) as HubHistoryState;
      const isPrimaryNavigation = Boolean(anchor.dataset.hubPrimary);

      if (anchor.dataset.navMode === 'up') {
        if (
          shouldTraverseBackForUp(
            historyState.hubParent,
            historyState.hubParentInHistory,
            nextLocation,
          )
        ) {
          window.history.back();
          return;
        }
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent =
          explicitParentForNavigation(anchor) ??
          parentForNavigation(currentPath, window.location.search, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent, hubParentInHistory: true } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      const remembered = rememberHubDestination(`${destination.pathname}${destination.search}`);
      startTransition(() => {
        setPath(destination.pathname);
        setHubDestinations(remembered);
      });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('pointerover', onDocumentPreloadIntent);
    document.addEventListener('pointerdown', onDocumentPreloadIntent);
    document.addEventListener('focusin', onDocumentPreloadIntent);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerover', onDocumentPreloadIntent);
      document.removeEventListener('pointerdown', onDocumentPreloadIntent);
      document.removeEventListener('focusin', onDocumentPreloadIntent);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path === '/champion-store' || path === '/champion-store/') {
    return (
      <HubFrame active="store" destinations={hubDestinations}>
        <ChampionStorePage />
      </HubFrame>
    );
  }

  if (path === '/jornada' || path === '/jornada/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="journey" label="RETOMANDO JORNADA" />}>
          <JourneyPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO BOX" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO TIME" />}>
          <TeamPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (isOwnedPokemonInstancePath(path)) {
    const historyState = (window.history.state ?? {}) as HubHistoryState;
    const instanceId = getPokemonRouteSlug(path);
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO POKÉMON" />}>
          <OwnedPokemonDetailPage
            key={instanceId}
            instanceId={instanceId}
            returnHref={historyState.hubParent ?? '/pokemon'}
          />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/') && resolveProductRoute(path).kind === 'route') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="ABRINDO REGISTRO" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="PREPARANDO ÍNDICE" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
    );
  }

  return <ProductNotFound destinations={hubDestinations} />;
}
,
    category: 'MECÂNICA',
    summary:
      'Acesso à Terastalização: transformação temporária cristalizada com um Tera Type que pode reforçar ou alterar o tipo do Pokémon.',
  },
  {
    code: 'Z',
    title: 'Movimento Z',
    price: '40,00 
const SECTION_ROOTS: Record<HubSection, string> = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
  store: '/champion-store',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
  hubParentInHistory?: boolean;
};

type FallbackModule = 'journey' | 'pokedex' | 'box';

const FALLBACK_LABELS: Record<FallbackModule, string> = {
  journey: 'JORNADA',
  pokedex: 'POKÉDEX',
  box: 'BOX',
};

function HubFrame({
  active,
  destinations,
  children,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
}) {
  return (
    <HubNavigation active={active} destinations={destinations}>
      {children}
    </HubNavigation>
  );
}

function RouteFallback({ label, module }: { label: string; module: FallbackModule }) {
  return (
    <section
      className="hub-route-fallback"
      data-hub-fallback={module}
      aria-busy="true"
      aria-label={label}
    >
      <div className="hub-route-fallback-head">
        <span className="hub-route-fallback-lens" aria-hidden="true" />
        <span>
          <strong>{FALLBACK_LABELS[module]}</strong>
          <small>{label}</small>
        </span>
      </div>
      <div className="hub-route-fallback-body" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ProductNotFound({ destinations }: { destinations: HubDestinations }) {
  return (
    <HubFrame active={null} destinations={destinations}>
      <section className="hub-route-fallback hub-product-not-found" data-hub-fallback="journey">
        <div className="hub-route-fallback-head">
          <span className="hub-route-fallback-lens" aria-hidden="true" />
          <span>
            <strong>POKÉMON HUB</strong>
            <small>ENDEREÇO INDISPONÍVEL</small>
          </span>
        </div>
        <div className="hub-product-not-found-body">
          <p>Este endereço não faz parte da versão atual do Hub.</p>
          <a href="/jornada">VOLTAR À JORNADA</a>
        </div>
      </section>
    </HubFrame>
  );
}

function getPath() {
  const rawPath = window.location.pathname === '/' ? '/jornada' : window.location.pathname;
  const resolution = resolveProductRoute(rawPath);
  if (resolution.kind === 'redirect') {
    const nextLocation = `${resolution.to}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    return resolution.to;
  }
  return rawPath;
}

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

function isOwnedPokemonInstancePath(path: string) {
  return path.startsWith('/pokemon/') && resolveProductRoute(path).kind === 'route';
}

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  return Number.parseInt(raw, 10);
}

function resetRecordViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function isRecordPath(path: string) {
  return path.startsWith('/pokemon/') || path.startsWith('/pokedex/');
}

function isPokedexIndexPath(path: string) {
  return path === '/pokedex' || path === '/pokedex/';
}

function usesSiblingHistoryReplacement(anchor: HTMLAnchorElement) {
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav, .owned-pokemon-side-nav'));
}

function explicitParentForNavigation(anchor: HTMLAnchorElement) {
  const raw = anchor.dataset.hubParent;
  if (!raw?.startsWith('/')) return undefined;
  const parent = new URL(raw, window.location.origin);
  if (parent.origin !== window.location.origin) return undefined;
  return `${parent.pathname}${parent.search}${parent.hash}`;
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, currentSearch: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  const currentRoot = rootForPath(currentPath);
  const normalizedCurrent = currentPath.replace(/\/$/, '');

  if (
    isOwnedPokemonInstancePath(destinationPath) &&
    currentSection === 'box' &&
    (normalizedCurrent === '/pokemon' || normalizedCurrent === '/team')
  ) {
    return `${normalizedCurrent}${currentSearch}`;
  }

  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (currentRoot === normalizedCurrent) {
    return `${normalizedCurrent}${currentSearch}`;
  }
  return undefined;
}

function stateForPrimaryDestination(destinationPath: string): HubHistoryState {
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection) return {};
  const destinationRoot = SECTION_ROOTS[destinationSection];
  const isRoot = destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`;
  return {
    hubSection: destinationSection,
    ...(!isRoot ? { hubParent: destinationRoot } : {}),
  };
}

function warmAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const pending = preloadProductRoute(destination.pathname);
  if (pending) void pending.catch(() => undefined);
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);
  const playerPortalSession = usePlayerPortalBrowserSession();

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ hubSection: 'journey' } satisfies HubHistoryState, '', '/jornada');
    }

    const initialSection = hubSectionForPath(window.location.pathname);
    const existing = (window.history.state ?? {}) as HubHistoryState;
    if (initialSection && !existing.hubSection) {
      const root = SECTION_ROOTS[initialSection];
      const currentPath = window.location.pathname;
      const isRoot = currentPath === root || currentPath === `${root}/`;
      window.history.replaceState(
        {
          ...existing,
          hubSection: initialSection,
          ...(!isRoot ? { hubParent: root } : {}),
        },
        '',
        window.location.href,
      );
    }
    setHubDestinations(rememberHubDestination(getHubLocation()));
  }, []);

  useEffect(() => {
    if (isRecordPath(path)) {
      resetRecordViewport();
    } else if (!isPokedexIndexPath(path)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      const remembered = rememberHubDestination(getHubLocation());
      startTransition(() => {
        setPath(nextPath);
        setHubDestinations(remembered);
      });
    };

    const onDocumentPreloadIntent = (event: Event) => {
      warmAnchorTarget(event.target);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const resolution = resolveProductRoute(destination.pathname);
      if (resolution.kind === 'redirect') {
        destination.pathname = resolution.to;
      }

      const currentPath = window.location.pathname;
      const sameDocumentHash =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        Boolean(destination.hash) &&
        destination.hash !== window.location.hash;
      if (sameDocumentHash) return;

      const sameDestination =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash;

      if (sameDestination) {
        event.preventDefault();
        return;
      }

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const historyState = (window.history.state ?? {}) as HubHistoryState;
      const isPrimaryNavigation = Boolean(anchor.dataset.hubPrimary);

      if (anchor.dataset.navMode === 'up') {
        if (
          shouldTraverseBackForUp(
            historyState.hubParent,
            historyState.hubParentInHistory,
            nextLocation,
          )
        ) {
          window.history.back();
          return;
        }
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent =
          explicitParentForNavigation(anchor) ??
          parentForNavigation(currentPath, window.location.search, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent, hubParentInHistory: true } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      const remembered = rememberHubDestination(`${destination.pathname}${destination.search}`);
      startTransition(() => {
        setPath(destination.pathname);
        setHubDestinations(remembered);
      });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('pointerover', onDocumentPreloadIntent);
    document.addEventListener('pointerdown', onDocumentPreloadIntent);
    document.addEventListener('focusin', onDocumentPreloadIntent);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerover', onDocumentPreloadIntent);
      document.removeEventListener('pointerdown', onDocumentPreloadIntent);
      document.removeEventListener('focusin', onDocumentPreloadIntent);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path === '/jornada' || path === '/jornada/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="journey" label="RETOMANDO JORNADA" />}>
          <JourneyPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO BOX" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO TIME" />}>
          <TeamPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (isOwnedPokemonInstancePath(path)) {
    const historyState = (window.history.state ?? {}) as HubHistoryState;
    const instanceId = getPokemonRouteSlug(path);
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO POKÉMON" />}>
          <OwnedPokemonDetailPage
            key={instanceId}
            instanceId={instanceId}
            returnHref={historyState.hubParent ?? '/pokemon'}
          />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/') && resolveProductRoute(path).kind === 'route') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="ABRINDO REGISTRO" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="PREPARANDO ÍNDICE" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
    );
  }

  return <ProductNotFound destinations={hubDestinations} />;
}
,
    category: 'MECÂNICA',
    summary:
      'Acesso a Z-Moves oficiais em batalhas elegíveis ou ao desenvolvimento de um Z-Move original sujeito à análise e balanceamento da equipe.',
    bullets: ['Conceito e nome próprios', 'Aparência e funcionamento', 'Parâmetros finais definidos pela equipe'],
  },
  {
    code: 'GMAX',
    title: 'Gigantamax',
    price: '60,00',
    category: 'MECÂNICA',
    summary:
      'Acesso permanente do personagem à mecânica de Gigantamax para um Pokémon elegível durante batalhas e encontros.',
  },
  {
    code: 'LUCK',
    title: 'Benção da Sorte',
    price: 'R$ 60,00',
    category: 'JORNADA',
    summary:
      'Bônus permanente de 2× nas chances de captura em encontros selvagens elegíveis, aplicado automaticamente pelo sistema.',
  },
  {
    code: 'SAVE+',
    title: 'Save Premium',
    price: 'R$ 45,00',
    category: 'JORNADA',
    summary:
      'Preserva progresso elegível da jornada para uso futuro, incluindo conteúdos que possam permanecer associados ao Save.',
  },
  {
    code: 'GEN',
    title: 'Pokémon Gênesis',
    price: '60,00 
const SECTION_ROOTS: Record<HubSection, string> = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
  store: '/champion-store',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
  hubParentInHistory?: boolean;
};

type FallbackModule = 'journey' | 'pokedex' | 'box';

const FALLBACK_LABELS: Record<FallbackModule, string> = {
  journey: 'JORNADA',
  pokedex: 'POKÉDEX',
  box: 'BOX',
};

function HubFrame({
  active,
  destinations,
  children,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
}) {
  return (
    <HubNavigation active={active} destinations={destinations}>
      {children}
    </HubNavigation>
  );
}

function RouteFallback({ label, module }: { label: string; module: FallbackModule }) {
  return (
    <section
      className="hub-route-fallback"
      data-hub-fallback={module}
      aria-busy="true"
      aria-label={label}
    >
      <div className="hub-route-fallback-head">
        <span className="hub-route-fallback-lens" aria-hidden="true" />
        <span>
          <strong>{FALLBACK_LABELS[module]}</strong>
          <small>{label}</small>
        </span>
      </div>
      <div className="hub-route-fallback-body" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ProductNotFound({ destinations }: { destinations: HubDestinations }) {
  return (
    <HubFrame active={null} destinations={destinations}>
      <section className="hub-route-fallback hub-product-not-found" data-hub-fallback="journey">
        <div className="hub-route-fallback-head">
          <span className="hub-route-fallback-lens" aria-hidden="true" />
          <span>
            <strong>POKÉMON HUB</strong>
            <small>ENDEREÇO INDISPONÍVEL</small>
          </span>
        </div>
        <div className="hub-product-not-found-body">
          <p>Este endereço não faz parte da versão atual do Hub.</p>
          <a href="/jornada">VOLTAR À JORNADA</a>
        </div>
      </section>
    </HubFrame>
  );
}

function getPath() {
  const rawPath = window.location.pathname === '/' ? '/jornada' : window.location.pathname;
  const resolution = resolveProductRoute(rawPath);
  if (resolution.kind === 'redirect') {
    const nextLocation = `${resolution.to}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    return resolution.to;
  }
  return rawPath;
}

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

function isOwnedPokemonInstancePath(path: string) {
  return path.startsWith('/pokemon/') && resolveProductRoute(path).kind === 'route';
}

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  return Number.parseInt(raw, 10);
}

function resetRecordViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function isRecordPath(path: string) {
  return path.startsWith('/pokemon/') || path.startsWith('/pokedex/');
}

function isPokedexIndexPath(path: string) {
  return path === '/pokedex' || path === '/pokedex/';
}

function usesSiblingHistoryReplacement(anchor: HTMLAnchorElement) {
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav, .owned-pokemon-side-nav'));
}

function explicitParentForNavigation(anchor: HTMLAnchorElement) {
  const raw = anchor.dataset.hubParent;
  if (!raw?.startsWith('/')) return undefined;
  const parent = new URL(raw, window.location.origin);
  if (parent.origin !== window.location.origin) return undefined;
  return `${parent.pathname}${parent.search}${parent.hash}`;
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, currentSearch: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  const currentRoot = rootForPath(currentPath);
  const normalizedCurrent = currentPath.replace(/\/$/, '');

  if (
    isOwnedPokemonInstancePath(destinationPath) &&
    currentSection === 'box' &&
    (normalizedCurrent === '/pokemon' || normalizedCurrent === '/team')
  ) {
    return `${normalizedCurrent}${currentSearch}`;
  }

  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (currentRoot === normalizedCurrent) {
    return `${normalizedCurrent}${currentSearch}`;
  }
  return undefined;
}

function stateForPrimaryDestination(destinationPath: string): HubHistoryState {
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection) return {};
  const destinationRoot = SECTION_ROOTS[destinationSection];
  const isRoot = destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`;
  return {
    hubSection: destinationSection,
    ...(!isRoot ? { hubParent: destinationRoot } : {}),
  };
}

function warmAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const pending = preloadProductRoute(destination.pathname);
  if (pending) void pending.catch(() => undefined);
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);
  const playerPortalSession = usePlayerPortalBrowserSession();

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ hubSection: 'journey' } satisfies HubHistoryState, '', '/jornada');
    }

    const initialSection = hubSectionForPath(window.location.pathname);
    const existing = (window.history.state ?? {}) as HubHistoryState;
    if (initialSection && !existing.hubSection) {
      const root = SECTION_ROOTS[initialSection];
      const currentPath = window.location.pathname;
      const isRoot = currentPath === root || currentPath === `${root}/`;
      window.history.replaceState(
        {
          ...existing,
          hubSection: initialSection,
          ...(!isRoot ? { hubParent: root } : {}),
        },
        '',
        window.location.href,
      );
    }
    setHubDestinations(rememberHubDestination(getHubLocation()));
  }, []);

  useEffect(() => {
    if (isRecordPath(path)) {
      resetRecordViewport();
    } else if (!isPokedexIndexPath(path)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      const remembered = rememberHubDestination(getHubLocation());
      startTransition(() => {
        setPath(nextPath);
        setHubDestinations(remembered);
      });
    };

    const onDocumentPreloadIntent = (event: Event) => {
      warmAnchorTarget(event.target);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const resolution = resolveProductRoute(destination.pathname);
      if (resolution.kind === 'redirect') {
        destination.pathname = resolution.to;
      }

      const currentPath = window.location.pathname;
      const sameDocumentHash =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        Boolean(destination.hash) &&
        destination.hash !== window.location.hash;
      if (sameDocumentHash) return;

      const sameDestination =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash;

      if (sameDestination) {
        event.preventDefault();
        return;
      }

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const historyState = (window.history.state ?? {}) as HubHistoryState;
      const isPrimaryNavigation = Boolean(anchor.dataset.hubPrimary);

      if (anchor.dataset.navMode === 'up') {
        if (
          shouldTraverseBackForUp(
            historyState.hubParent,
            historyState.hubParentInHistory,
            nextLocation,
          )
        ) {
          window.history.back();
          return;
        }
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent =
          explicitParentForNavigation(anchor) ??
          parentForNavigation(currentPath, window.location.search, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent, hubParentInHistory: true } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      const remembered = rememberHubDestination(`${destination.pathname}${destination.search}`);
      startTransition(() => {
        setPath(destination.pathname);
        setHubDestinations(remembered);
      });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('pointerover', onDocumentPreloadIntent);
    document.addEventListener('pointerdown', onDocumentPreloadIntent);
    document.addEventListener('focusin', onDocumentPreloadIntent);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerover', onDocumentPreloadIntent);
      document.removeEventListener('pointerdown', onDocumentPreloadIntent);
      document.removeEventListener('focusin', onDocumentPreloadIntent);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path === '/jornada' || path === '/jornada/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="journey" label="RETOMANDO JORNADA" />}>
          <JourneyPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO BOX" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO TIME" />}>
          <TeamPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (isOwnedPokemonInstancePath(path)) {
    const historyState = (window.history.state ?? {}) as HubHistoryState;
    const instanceId = getPokemonRouteSlug(path);
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO POKÉMON" />}>
          <OwnedPokemonDetailPage
            key={instanceId}
            instanceId={instanceId}
            returnHref={historyState.hubParent ?? '/pokemon'}
          />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/') && resolveProductRoute(path).kind === 'route') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="ABRINDO REGISTRO" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="PREPARANDO ÍNDICE" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
    );
  }

  return <ProductNotFound destinations={hubDestinations} />;
}
,
    category: 'CRIAÇÃO',
    summary:
      'Direito de desenvolver uma espécie Pokémon original para Pokémon Beyond, com linha evolutiva de até três estágios.',
    bullets: ['Nome e aparência', 'Tipos e habilidades', 'Personalidade e conceito', 'Linha evolutiva'],
  },
  {
    code: 'GYM',
    title: 'Insígnia de Ginásio',
    price: 'R$ 100,00',
    category: 'FUNÇÃO',
    summary:
      'Direito de assumir, mediante aprovação, o cargo de Líder de Ginásio e participar da construção de sua identidade e desafios.',
    bullets: ['Equipe de cinco Pokémon', 'Tipo do Ginásio', 'Identidade e desafios', 'Sujeito às regras administrativas do RPG'],
  },
  {
    code: 'RED',
    title: 'Save Red',
    price: 'R$ 60,00',
    category: 'SAVE',
    summary:
      'Pacote inspirado na trajetória de Red com Pokémon da jornada em nível inicial, conteúdos exclusivos e recursos para o início da aventura.',
  },
  {
    code: 'EGG',
    title: 'Ovo Pokémon',
    price: 'A partir de R$ 20',
    category: 'POKÉMON',
    summary:
      'Receba um Ovo Pokémon misterioso. A espécie nasce após os requisitos de eclosão e depende da categoria adquirida.',
    variants: [
      { label: 'Comum', price: 'R$ 20', description: 'Possibilidades mais frequentes.' },
      { label: 'Raro', price: 'R$ 30', description: 'Possibilidades mais incomuns e raridades maiores.' },
      { label: 'Especial', price: 'R$ 45', description: 'Categoria mais exclusiva, com possibilidades próprias.' },
    ],
  },
  {
    code: '2XP',
    title: 'XP em Dobro',
    price: 'R$ 40,00',
    category: 'PROGRESSÃO',
    duration: '7 DIAS',
    summary:
      '2× a experiência recebida em atividades elegíveis durante o período ativo da Gamepass.',
  },
];

function ChampionStorePage() {
  return (
    <main className="champion-store-page">
      <HubModuleHeader module="store" metaLabel="STATUS" metaValue="CATÁLOGO" />

      <section className="champion-store-hero">
        <div className="champion-store-kicker">POKÉMON BEYOND · GAMEPASSES</div>
        <h1>Champion Store</h1>
        <p>
          Benefícios especiais, conteúdos e acessos para sua jornada. Consulte o catálogo antes
          de solicitar uma aquisição.
        </p>
        <div className="champion-store-notice">
          <strong>CATÁLOGO TEMPORÁRIO</strong>
          <span>
            Valores e regras seguem o documento atual. Aquisições são confirmadas pela equipe e
            os conteúdos geralmente são entregues em até 64 horas após a confirmação do pagamento.
          </span>
        </div>
      </section>

      <section className="champion-store-grid" aria-label="Gamepasses disponíveis">
        {CHAMPION_STORE_OFFERS.map((offer) => (
          <article className="champion-store-card" key={offer.code}>
            <header>
              <span className="champion-store-code" aria-hidden="true">{offer.code}</span>
              <div>
                <small>{offer.category}</small>
                <h2>{offer.title}</h2>
              </div>
            </header>

            <p>{offer.summary}</p>

            {offer.bullets ? (
              <ul>
                {offer.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            ) : null}

            {offer.variants ? (
              <div className="champion-store-variants">
                {offer.variants.map((variant) => (
                  <div key={variant.label}>
                    <span>{variant.label}</span>
                    <strong>{variant.price}</strong>
                    <small>{variant.description}</small>
                  </div>
                ))}
              </div>
            ) : null}

            <footer>
              <div>
                {offer.duration ? <small>{offer.duration}</small> : <small>VALOR</small>}
                <strong>{offer.price}</strong>
              </div>
              <span>CONSULTA</span>
            </footer>
          </article>
        ))}
      </section>

      <section className="champion-store-boundary">
        <strong>AQUISIÇÃO</strong>
        <p>
          Esta tela apresenta o catálogo. O Pokémon Beyond ainda não processa pagamento nem
          concede Gamepass automaticamente pelo Hub.
        </p>
      </section>
    </main>
  );
}

const SECTION_ROOTS: Record<HubSection, string> = {
  journey: '/jornada',
  pokedex: '/pokedex',
  box: '/pokemon',
  store: '/champion-store',
};

type HubHistoryState = {
  hubSection?: HubSection;
  hubParent?: string;
  hubParentInHistory?: boolean;
};

type FallbackModule = 'journey' | 'pokedex' | 'box';

const FALLBACK_LABELS: Record<FallbackModule, string> = {
  journey: 'JORNADA',
  pokedex: 'POKÉDEX',
  box: 'BOX',
};

function HubFrame({
  active,
  destinations,
  children,
}: {
  active: HubSection | null;
  destinations: HubDestinations;
  children: ReactNode;
}) {
  return (
    <HubNavigation active={active} destinations={destinations}>
      {children}
    </HubNavigation>
  );
}

function RouteFallback({ label, module }: { label: string; module: FallbackModule }) {
  return (
    <section
      className="hub-route-fallback"
      data-hub-fallback={module}
      aria-busy="true"
      aria-label={label}
    >
      <div className="hub-route-fallback-head">
        <span className="hub-route-fallback-lens" aria-hidden="true" />
        <span>
          <strong>{FALLBACK_LABELS[module]}</strong>
          <small>{label}</small>
        </span>
      </div>
      <div className="hub-route-fallback-body" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ProductNotFound({ destinations }: { destinations: HubDestinations }) {
  return (
    <HubFrame active={null} destinations={destinations}>
      <section className="hub-route-fallback hub-product-not-found" data-hub-fallback="journey">
        <div className="hub-route-fallback-head">
          <span className="hub-route-fallback-lens" aria-hidden="true" />
          <span>
            <strong>POKÉMON HUB</strong>
            <small>ENDEREÇO INDISPONÍVEL</small>
          </span>
        </div>
        <div className="hub-product-not-found-body">
          <p>Este endereço não faz parte da versão atual do Hub.</p>
          <a href="/jornada">VOLTAR À JORNADA</a>
        </div>
      </section>
    </HubFrame>
  );
}

function getPath() {
  const rawPath = window.location.pathname === '/' ? '/jornada' : window.location.pathname;
  const resolution = resolveProductRoute(rawPath);
  if (resolution.kind === 'redirect') {
    const nextLocation = `${resolution.to}${window.location.search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextLocation);
    return resolution.to;
  }
  return rawPath;
}

function getHubLocation() {
  return `${window.location.pathname}${window.location.search}`;
}

function getPokemonRouteSlug(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? '';
}

function isOwnedPokemonInstancePath(path: string) {
  return path.startsWith('/pokemon/') && resolveProductRoute(path).kind === 'route';
}

function getPokedexDex(path: string) {
  const raw = path.split('/').filter(Boolean)[1] ?? '1';
  return Number.parseInt(raw, 10);
}

function resetRecordViewport() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
}

function isRecordPath(path: string) {
  return path.startsWith('/pokemon/') || path.startsWith('/pokedex/');
}

function isPokedexIndexPath(path: string) {
  return path === '/pokedex' || path === '/pokedex/';
}

function usesSiblingHistoryReplacement(anchor: HTMLAnchorElement) {
  return Boolean(anchor.closest('.pokedex-species-side-nav, .dex-nav, .owned-pokemon-side-nav'));
}

function explicitParentForNavigation(anchor: HTMLAnchorElement) {
  const raw = anchor.dataset.hubParent;
  if (!raw?.startsWith('/')) return undefined;
  const parent = new URL(raw, window.location.origin);
  if (parent.origin !== window.location.origin) return undefined;
  return `${parent.pathname}${parent.search}${parent.hash}`;
}

function rootForPath(path: string) {
  const section = hubSectionForPath(path);
  return section ? SECTION_ROOTS[section] : null;
}

function parentForNavigation(currentPath: string, currentSearch: string, destinationPath: string) {
  const currentSection = hubSectionForPath(currentPath);
  const destinationSection = hubSectionForPath(destinationPath);
  const currentRoot = rootForPath(currentPath);
  const normalizedCurrent = currentPath.replace(/\/$/, '');

  if (
    isOwnedPokemonInstancePath(destinationPath) &&
    currentSection === 'box' &&
    (normalizedCurrent === '/pokemon' || normalizedCurrent === '/team')
  ) {
    return `${normalizedCurrent}${currentSearch}`;
  }

  if (!destinationSection || currentSection !== destinationSection) return undefined;
  const destinationRoot = SECTION_ROOTS[destinationSection];
  if (destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`) return undefined;
  if (currentRoot === normalizedCurrent) {
    return `${normalizedCurrent}${currentSearch}`;
  }
  return undefined;
}

function stateForPrimaryDestination(destinationPath: string): HubHistoryState {
  const destinationSection = hubSectionForPath(destinationPath);
  if (!destinationSection) return {};
  const destinationRoot = SECTION_ROOTS[destinationSection];
  const isRoot = destinationPath === destinationRoot || destinationPath === `${destinationRoot}/`;
  return {
    hubSection: destinationSection,
    ...(!isRoot ? { hubParent: destinationRoot } : {}),
  };
}

function warmAnchorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  if (anchor.hasAttribute('download')) return;

  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;

  const pending = preloadProductRoute(destination.pathname);
  if (pending) void pending.catch(() => undefined);
}

export function App() {
  const [path, setPath] = useState(getPath);
  const [hubDestinations, setHubDestinations] = useState(readHubDestinations);
  const playerPortalSession = usePlayerPortalBrowserSession();

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({ hubSection: 'journey' } satisfies HubHistoryState, '', '/jornada');
    }

    const initialSection = hubSectionForPath(window.location.pathname);
    const existing = (window.history.state ?? {}) as HubHistoryState;
    if (initialSection && !existing.hubSection) {
      const root = SECTION_ROOTS[initialSection];
      const currentPath = window.location.pathname;
      const isRoot = currentPath === root || currentPath === `${root}/`;
      window.history.replaceState(
        {
          ...existing,
          hubSection: initialSection,
          ...(!isRoot ? { hubParent: root } : {}),
        },
        '',
        window.location.href,
      );
    }
    setHubDestinations(rememberHubDestination(getHubLocation()));
  }, []);

  useEffect(() => {
    if (isRecordPath(path)) {
      resetRecordViewport();
    } else if (!isPokedexIndexPath(path)) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = getPath();
      const remembered = rememberHubDestination(getHubLocation());
      startTransition(() => {
        setPath(nextPath);
        setHubDestinations(remembered);
      });
    };

    const onDocumentPreloadIntent = (event: Event) => {
      warmAnchorTarget(event.target);
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const resolution = resolveProductRoute(destination.pathname);
      if (resolution.kind === 'redirect') {
        destination.pathname = resolution.to;
      }

      const currentPath = window.location.pathname;
      const sameDocumentHash =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        Boolean(destination.hash) &&
        destination.hash !== window.location.hash;
      if (sameDocumentHash) return;

      const sameDestination =
        destination.pathname === currentPath &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash;

      if (sameDestination) {
        event.preventDefault();
        return;
      }

      if (isPokedexIndexPath(currentPath)) {
        rememberPokedexIndexScroll(window.scrollY);
      }

      event.preventDefault();
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const historyState = (window.history.state ?? {}) as HubHistoryState;
      const isPrimaryNavigation = Boolean(anchor.dataset.hubPrimary);

      if (anchor.dataset.navMode === 'up') {
        if (
          shouldTraverseBackForUp(
            historyState.hubParent,
            historyState.hubParentInHistory,
            nextLocation,
          )
        ) {
          window.history.back();
          return;
        }
        const destinationSection = hubSectionForPath(destination.pathname);
        const nextState: HubHistoryState = destinationSection ? { hubSection: destinationSection } : {};
        window.history.replaceState(nextState, '', nextLocation);
      } else if (isPrimaryNavigation) {
        window.history.replaceState(stateForPrimaryDestination(destination.pathname), '', nextLocation);
      } else if (usesSiblingHistoryReplacement(anchor)) {
        window.history.replaceState(historyState, '', nextLocation);
      } else {
        const destinationSection = hubSectionForPath(destination.pathname);
        const parent =
          explicitParentForNavigation(anchor) ??
          parentForNavigation(currentPath, window.location.search, destination.pathname);
        const nextState: HubHistoryState = {
          ...(destinationSection ? { hubSection: destinationSection } : {}),
          ...(parent ? { hubParent: parent, hubParentInHistory: true } : {}),
        };
        window.history.pushState(nextState, '', nextLocation);
      }

      const remembered = rememberHubDestination(`${destination.pathname}${destination.search}`);
      startTransition(() => {
        setPath(destination.pathname);
        setHubDestinations(remembered);
      });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('pointerover', onDocumentPreloadIntent);
    document.addEventListener('pointerdown', onDocumentPreloadIntent);
    document.addEventListener('focusin', onDocumentPreloadIntent);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('pointerover', onDocumentPreloadIntent);
      document.removeEventListener('pointerdown', onDocumentPreloadIntent);
      document.removeEventListener('focusin', onDocumentPreloadIntent);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (path === '/jornada' || path === '/jornada/') {
    return (
      <HubFrame active="journey" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="journey" label="RETOMANDO JORNADA" />}>
          <JourneyPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokemon' || path === '/pokemon/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO BOX" />}>
          <OwnedPokemonCollectionPage />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/team' || path === '/team/') {
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO TIME" />}>
          <TeamPage playerPortalSession={playerPortalSession} />
        </Suspense>
      </HubFrame>
    );
  }
  if (isOwnedPokemonInstancePath(path)) {
    const historyState = (window.history.state ?? {}) as HubHistoryState;
    const instanceId = getPokemonRouteSlug(path);
    return (
      <HubFrame active="box" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="box" label="ABRINDO POKÉMON" />}>
          <OwnedPokemonDetailPage
            key={instanceId}
            instanceId={instanceId}
            returnHref={historyState.hubParent ?? '/pokemon'}
          />
        </Suspense>
      </HubFrame>
    );
  }
  if (path.startsWith('/pokedex/') && resolveProductRoute(path).kind === 'route') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="ABRINDO REGISTRO" />}>
          <PokedexSpeciesPage dex={getPokedexDex(path)} />
        </Suspense>
      </HubFrame>
    );
  }
  if (path === '/pokedex' || path === '/pokedex/') {
    return (
      <HubFrame active="pokedex" destinations={hubDestinations}>
        <Suspense fallback={<RouteFallback module="pokedex" label="PREPARANDO ÍNDICE" />}>
          <PokedexIndexPage />
        </Suspense>
      </HubFrame>
    );
  }

  return <ProductNotFound destinations={hubDestinations} />;
}
