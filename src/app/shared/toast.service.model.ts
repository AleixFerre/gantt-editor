export const TOAST_DISMISS_MS = 2500;

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
