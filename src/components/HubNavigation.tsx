import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { HubDestinations, HubSection } from '../navigation/hubNavigationSession';
import './hub-navigation.css';

export type { HubSection } from '../navigation/hubNavigationSession';

type HubNavigationProps = {
  active: HubSection | null;
  destinations: HubDestinations;
};

type NavItem = {
  id: HubSection;
  label: string;
  description: string;
  icon: 'journey' | 'dex' | 'box';
};

type MenuHistoryState = Record<string, unknown> & {
  hubMenu?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'journey', label: 'JORNADA', description: 'Continue o RPG', icon: 'journey' },
  { id: 'pokedex', label: 'POKÉDEX', description: 'Espécies, descoberta e pesquisa', icon: 'dex' },
  { id: 'box', label: 'BOX', description: 'Time, coleção e organização', icon: 'box' },
];

const HUB_ROUTE_PRELOADERS: Record<HubSection, () => Promise<unknown>> = {
  journey: () => import('../features/journey/JourneyPage'),
  pokedex: () => import('../features/pokedex/PokedexIndexPage'),
  box: () => import('../features/collection/OwnedPokemonCollectionPage'),
};

function preloadHubRoute(section: HubSection) {
  void HUB_ROUTE_PRELOADERS[section]().catch(() => undefined);
}

function currentHistoryState(): MenuHistoryState {
  const state = window.history.state;
  return state && typeof state === 'object' ? (state as MenuHistoryState) : {};
}

function HubMark() {
  return (
    <svg className="hub-menu-brand-mark" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="17.5" />
      <path d="M4.5 22h35" />
      <circle cx="22" cy="22" r="5.2" />
    </svg>
  );
}

function NavGlyph({ icon }: { icon: NavItem['icon'] }) {
  if (icon === 'journey') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="10.5" />
        <path d="m19.6 11.2-2.1 6.3-5.1 3.3 2.1-6.3z" />
        <circle cx="16" cy="16" r="1.4" />
      </svg>
    );
  }
  if (icon === 'dex') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 7.5h16v17H8zM11.5 12h9M11.5 16h6M11.5 20h8" />
        <circle cx="22.5" cy="10" r="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7.5 9.5h17v14h-17zM7.5 14h17" />
      <path d="M11 18h4v3h-4zM17 18h4v3h-4z" />
      <path d="M12 9.5V7.8h8v1.7" />
    </svg>
  );
}

export function HubNavigation({ active, destinations }: HubNavigationProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prioritySection = active ?? 'journey';
    preloadHubRoute(prioritySection);
    const preloadTimers = NAV_ITEMS
      .filter((item) => item.id !== prioritySection)
      .map((item, index) =>
        window.setTimeout(() => preloadHubRoute(item.id), 1800 + index * 900),
      );
    return () => {
      for (const timer of preloadTimers) window.clearTimeout(timer);
    };
  }, [active]);

  useEffect(() => {
    const onPopState = () => {
      if (open && !currentHistoryState().hubMenu) {
        setOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      const fallback = panelRef.current?.querySelector<HTMLElement>('a[href], button');
      (preferred ?? fallback)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  const openMenu = () => {
    if (open) return;
    for (const item of NAV_ITEMS) preloadHubRoute(item.id);
    window.history.pushState({ ...currentHistoryState(), hubMenu: true }, '', window.location.href);
    setOpen(true);
  };

  const closeMenu = () => {
    if (!open) return;
    if (currentHistoryState().hubMenu) {
      window.history.back();
      return;
    }
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? [],
    ).filter((element) => !element.hasAttribute('hidden'));
    if (focusable.length < 2) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="hub-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="hub-global-menu"
        onClick={openMenu}
      >
        <span className="hub-menu-trigger-grid" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>MENU</span>
      </button>

      {open ? (
        <div
          className="hub-menu-backdrop"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div
            id="hub-global-menu"
            ref={panelRef}
            className="hub-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal do Pokémon Hub"
            onKeyDown={onMenuKeyDown}
          >
            <header className="hub-menu-header">
              <div className="hub-menu-brand">
                <HubMark />
                <div>
                  <strong>POKÉMON HUB</strong>
                  <span>JORNADA · POKÉDEX · BOX</span>
                </div>
              </div>
              <button type="button" className="hub-menu-close" onClick={closeMenu} aria-label="Fechar menu">
                ×
              </button>
            </header>

            <nav className="hub-menu-grid" aria-label="Destinos principais">
              {NAV_ITEMS.map((item) => {
                const selected = active === item.id;
                const warmRoute = () => preloadHubRoute(item.id);
                return (
                  <a
                    key={item.id}
                    className={`hub-menu-tile is-${item.id}${selected ? ' is-active' : ''}`}
                    href={destinations[item.id]}
                    aria-current={selected ? 'page' : undefined}
                    data-hub-primary={item.id}
                    onClick={(event) => {
                      if (selected) {
                        event.preventDefault();
                        closeMenu();
                        return;
                      }
                      setOpen(false);
                    }}
                    onFocus={warmRoute}
                    onPointerDown={warmRoute}
                    onPointerEnter={warmRoute}
                  >
                    <span className="hub-menu-tile-icon">
                      <NavGlyph icon={item.icon} />
                    </span>
                    <span className="hub-menu-tile-copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                    <span className="hub-menu-tile-end">
                      {selected ? <small>ATUAL</small> : null}
                      <span aria-hidden="true">›</span>
                    </span>
                  </a>
                );
              })}
            </nav>

            <footer className="hub-menu-foot">
              <span>TIME</span>
              <strong>DENTRO DA BOX</strong>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
