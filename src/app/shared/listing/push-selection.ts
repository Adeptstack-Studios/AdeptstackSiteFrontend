import {HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {ToastService} from '../../services/toast-service';

/**
 * Pick several entries and send one push for all of them.
 * Making entries visible never sends anything; pushes are always triggered here on purpose.
 */
export class PushSelection {
  active = false;
  sending = false;
  readonly ids = new Set<number>();

  constructor(
    private readonly sendPush: (ids: number[]) => Observable<HttpResponse<string>>,
    private readonly toast: ToastService,
  ) {
  }

  get count() {
    return this.ids.size;
  }

  toggleMode() {
    this.active = !this.active;
    this.ids.clear();
  }

  toggle(id?: number) {
    if (id === undefined) return;
    if (this.ids.has(id)) {
      this.ids.delete(id);
    } else {
      this.ids.add(id);
    }
  }

  has(id?: number) {
    return id !== undefined && this.ids.has(id);
  }

  send() {
    if (this.ids.size === 0 || this.sending) return;

    this.sending = true;
    this.sendPush([...this.ids]).subscribe({
      next: response => {
        this.toast.success(response.body || 'Push sent.');
        this.sending = false;
        this.active = false;
        this.ids.clear();
      },
      error: () => this.sending = false
    });
  }
}
