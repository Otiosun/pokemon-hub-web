import type { ToastTone } from '../../app/toast-policy';

export interface ControlCenterToast {
  readonly id: string;
  readonly tone: ToastTone;
  readonly message: string;
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  readonly toasts: readonly ControlCenterToast[];
  readonly onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div aria-label="Avisos recentes" className="toast-viewport" role="region">
      {toasts.map((toast) => {
        const urgent = toast.tone === 'warning' || toast.tone === 'error';
        return (
          <article
            className={`control-toast is-${toast.tone}`}
            key={toast.id}
            role={urgent ? 'alert' : 'status'}
          >
            <span>{toast.message}</span>
            <button
              aria-label="Fechar aviso"
              className="toast-dismiss"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              ×
            </button>
          </article>
        );
      })}
    </div>
  );
}
