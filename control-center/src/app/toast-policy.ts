export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastPolicyEntry {
  readonly durationMs: number | null;
  readonly requiresPersistentSurface: boolean;
}

export const TOAST_POLICY: Readonly<Record<ToastTone, ToastPolicyEntry>> = {
  info: { durationMs: 6000, requiresPersistentSurface: false },
  success: { durationMs: 4500, requiresPersistentSurface: false },
  warning: { durationMs: 8000, requiresPersistentSurface: true },
  error: { durationMs: null, requiresPersistentSurface: true },
};
