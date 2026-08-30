import type { ControlCenterEnvironment } from '../../app/config';
import type { ControlCenterSection, ControlCenterSectionId } from '../../app/navigation';
import { environmentLabel } from './OperationalDiagnostics';

function AvailabilityBadge({ availability }: { availability: string }) {
  if (availability === 'planned') return <span className="nav-badge">EM PROJETO</span>;
  return null;
}

export function ControlCenterSidebar({
  activeSection,
  environment,
  onReload,
  onSelect,
  principalId,
  roleLabel,
  sections,
}: {
  activeSection: ControlCenterSectionId;
  environment: ControlCenterEnvironment;
  onReload: () => Promise<void>;
  onSelect: (section: ControlCenterSectionId) => void;
  principalId: string;
  roleLabel: string;
  sections: readonly ControlCenterSection[];
}) {
  const principalShort = `${principalId.slice(0, 8)}…${principalId.slice(-4)}`;

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-mark-core" />
        </div>
        <div>
          <span className="brand-kicker">POKÉMON RPG</span>
          <strong className="brand-name">Control Center</strong>
        </div>
      </div>

      <div className="environment-card" data-environment={environment}>
        <span className="environment-dot" aria-hidden="true" />
        <div>
          <span className="environment-label">AMBIENTE</span>
          <strong>{environmentLabel(environment)}</strong>
        </div>
        <span className="environment-meta">{environment.toUpperCase()}</span>
      </div>

      <nav className="primary-nav">
        {sections.map((section) => (
          <button
            className={`nav-item ${activeSection === section.id ? 'is-active' : ''}`}
            key={section.id}
            onClick={() => onSelect(section.id)}
            type="button"
          >
            <span className="nav-glyph" aria-hidden="true">
              {section.glyph}
            </span>
            <span className="nav-copy">
              <span className="nav-label">{section.label}</span>
              <span className="nav-description">{section.description}</span>
            </span>
            <AvailabilityBadge availability={section.availability} />
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="principal-avatar" aria-hidden="true">
          {roleLabel.slice(0, 1)}
        </div>
        <div className="principal-copy">
          <strong>{roleLabel}</strong>
          <span title={principalId}>{principalShort}</span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Revalidar sessão"
          onClick={() => void onReload()}
        >
          ↻
        </button>
      </div>
    </aside>
  );
}
