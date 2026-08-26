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
  icon: 'dex' | 'pokemon' | 'team';
};

const NAV_ITEMS: NavItem[] = [
  { id: 'pokedex', label: 'POKÉDEX', icon: 'dex' },
  { id: 'pokemon', label: 'POKÉMON', icon: 'pokemon' },
  { id: 'team', label: 'TIME', icon: 'team' },
];

function NavGlyph({ icon }: { icon: NavItem['icon'] }) {
  if (icon === 'dex') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.5h14v13H5zM8 9h8M8 12h5M8 15h7" />
      </svg>
    );
  }
  if (icon === 'pokemon') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" />
        <path d="M4.8 12h4.4M14.8 12h4.4" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="2.3" />
      <circle cx="16" cy="8" r="2.3" />
      <circle cx="8" cy="16" r="2.3" />
      <circle cx="16" cy="16" r="2.3" />
      <path d="M10.3 8h3.4M8 10.3v3.4M16 10.3v3.4M10.3 16h3.4" />
    </svg>
  );
}

export function HubNavigation({ active, destinations }: HubNavigationProps) {
  return (
    <nav className="hub-navigation" aria-label="Navegação principal do Pokémon Hub">
      <a className="hub-navigation-mark" href="/" aria-label="Pokémon Hub">
        <span aria-hidden="true" />
      </a>
      <div className="hub-navigation-items">
        {NAV_ITEMS.map((item) => {
          const selected = active === item.id;
          return (
            <a
              key={item.id}
              className={selected ? 'is-active' : undefined}
              href={destinations[item.id]}
              aria-current={selected ? 'page' : undefined}
              data-hub-primary={item.id}
            >
              <NavGlyph icon={item.icon} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
