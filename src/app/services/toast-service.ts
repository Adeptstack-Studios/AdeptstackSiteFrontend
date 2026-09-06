import {Injectable, signal} from '@angular/core';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

/** Short feedback messages, shown bottom right and dismissed on their own. */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private static readonly DURATION_MS = 4000;

  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 0;

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  show(message: string, kind: ToastKind = 'success') {
    const id = this.nextId++;
    this.toasts.update(list => [...list, {id, message, kind}]);
    setTimeout(() => this.dismiss(id), ToastService.DURATION_MS);
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(toast => toast.id !== id));
  }
}
