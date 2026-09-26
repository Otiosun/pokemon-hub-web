import { HubMenuTrigger } from './HubNavigation';
import './hub-module-header.css';

export type HubModule = 'journey' | 'pokedex' | 'pokemon' | 'team' | 'store' | 'systems';

type HubModuleHeaderProps = {
  module: HubModule;
  metaLabel: string;
  metaValue: string;
};

const MODULE_META: Record<HubModule, { label: string; href: string; ariaLabel?: string }> = {
  journey: { label: 'JORNADA', href: '/jornada' },
  pokedex: { label: 'POKÉDEX NACIONAL', href: '/pokedex' },
  pokemon: { label: 'BOX', href: '/pokemon' },
  team: { label: 'BOX · TIME ATIVO', href: '/pokemon', ariaLabel: 'Abrir BOX' },
  store: { label: 'CHAMPION STORE', href: '/champion-store' },
  systems: { label: 'SISTEMAS', href: '/sistemas' },
};

export function HubModuleHeader({ module, metaLabel, metaValue }: HubModuleHeaderProps) {
  const meta = MODULE_META[module];
  return (
    <header className={`hub-module-header is-${module}`}>
      <a className="hub-module-brand" href={meta.href} aria-label={meta.ariaLabel ?? `Abrir ${meta.label}`}>
        <span className="hub-module-lens" aria-hidden="true" />
        <span>
          <strong>POKÉMON BEYOND</strong>
          <small>{meta.label}</small>
        </span>
      </a>
      <div className="hub-module-actions">
        <div className="hub-module-meta">
          <small>{metaLabel}</small>
          <strong>{metaValue}</strong>
        </div>
        <HubMenuTrigger />
      </div>
    </header>
  );
}
