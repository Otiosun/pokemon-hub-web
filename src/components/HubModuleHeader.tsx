import './hub-module-header.css';

export type HubModule = 'pokedex' | 'pokemon' | 'team';

type HubModuleHeaderProps = {
  module: HubModule;
  metaLabel: string;
  metaValue: string;
};

const MODULE_META: Record<HubModule, { label: string; href: string; ariaLabel?: string }> = {
  pokedex: { label: 'POKÉDEX NACIONAL', href: '/pokedex' },
  pokemon: { label: 'BOX', href: '/pokemon' },
  team: { label: 'BOX · TIME ATIVO', href: '/pokemon', ariaLabel: 'Abrir BOX' },
};

export function HubModuleHeader({ module, metaLabel, metaValue }: HubModuleHeaderProps) {
  const meta = MODULE_META[module];
  return (
    <header className={`hub-module-header is-${module}`}>
      <a className="hub-module-brand" href={meta.href} aria-label={meta.ariaLabel ?? `Abrir ${meta.label}`}>
        <span className="hub-module-lens" aria-hidden="true" />
        <span>
          <strong>POKÉMON HUB</strong>
          <small>{meta.label}</small>
        </span>
      </a>
      <div className="hub-module-meta">
        <small>{metaLabel}</small>
        <strong>{metaValue}</strong>
      </div>
    </header>
  );
}
