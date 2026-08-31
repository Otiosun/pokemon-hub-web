import { type ReactNode, useEffect, useId } from 'react';

export function AdminDrawer({
  title,
  eyebrow,
  description,
  actions,
  children,
  onClose,
}: {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="admin-drawer-layer">
      <aside
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="admin-drawer"
        role="dialog"
      >
        <header className="admin-drawer-header">
          <div>
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <div className="admin-drawer-actions">
            {actions}
            <button autoFocus className="text-button" onClick={onClose} type="button">
              Fechar painel
            </button>
          </div>
        </header>

        <div className="admin-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
