import {Injectable, signal} from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

/**
 * Short feedback messages, shown bottom right and dismissed on their own.
 * Failed requests are reported by the error interceptor; pages only add the successes.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private static readonly DURATION_MS: Record<ToastKind, number> = {success: 4000, info: 5000, error: 7000};
  private static readonly MAX_VISIBLE = 4;

  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 0;

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  info(message: string) {
    this.show(message, 'info');
  }

  show(message: string, kind: ToastKind = 'success') {
    // the same failure from several parallel requests is shown once
    if (this.toasts().some(toast => toast.message === message && toast.kind === kind)) {
      return;
    }

    const id = this.nextId++;
    this.toasts.update(list => [...list, {id, message, kind}].slice(-ToastService.MAX_VISIBLE));
    setTimeout(() => this.dismiss(id), ToastService.DURATION_MS[kind]);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(toast => toast.id !== id));
  }
}
