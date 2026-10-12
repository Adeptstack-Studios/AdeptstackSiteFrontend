import {computed, signal} from '@angular/core';
import {forkJoin, Observable} from 'rxjs';
import {Visibility} from '../visibility-picker/visibility-picker';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {ToastService} from '../../services/toast-service';

interface Selectable {
  id?: number;
  visibility?: string;
}

/** Selected entries by id. Kept across pages, so one push or change can cover several pages. */
export class Selection<T extends Selectable> {
  readonly selected = signal(new Map<number, T>());
  readonly size = computed(() => this.selected().size);
  readonly busy = signal(false);

  has(item: T) {
    return this.selected().has(item.id!);
  }

  toggle(item: T) {
    this.selected.update(selected => {
      const next = new Map(selected);
      if (next.has(item.id!)) next.delete(item.id!); else next.set(item.id!, item);
      return next;
    });
  }

  /** The checkbox in the table head: selects the page, or clears it when all of it is selected. */
  togglePage(items: T[]) {
    const select = !this.allOf(items);
    this.selected.update(selected => {
      const next = new Map(selected);
      for (const item of items) {
        if (select) next.set(item.id!, item); else next.delete(item.id!);
      }
      return next;
    });
  }

  allOf(items: T[]) {
    return items.length > 0 && items.every(item => this.selected().has(item.id!));
  }

  someOf(items: T[]) {
    return !this.allOf(items) && items.some(item => this.selected().has(item.id!));
  }

  clear() {
    this.selected.set(new Map());
  }

  ids() {
    return [...this.selected().keys()];
  }

  /**
   * Sets the visibility of every selected entry that does not have it yet. Asks first before
   * something becomes public. Resolves to true when anything changed (or failed half way),
   * so the page knows it has to reload.
   */
  async setVisibility(visibility: Visibility, options: {
    update: (item: T & { visibility: Visibility }) => Observable<unknown>;
    noun: [string, string];
    confirm: ConfirmService;
    toast: ToastService;
  }): Promise<boolean> {
    const [one, many] = options.noun;
    const items = [...this.selected().values()].filter(item => item.visibility !== visibility);
    if (!items.length) {
      options.toast.info(`The selected ${many} are already ${visibility.toLowerCase()}.`);
      return false;
    }
    if (visibility === 'PUBLIC' && !await options.confirm.ask({
      title: `Publish ${items.length} ${items.length === 1 ? one : many}?`,
      message: 'They will be listed on adeptstack.net and in the app. No push is sent.',
      confirmLabel: 'Publish',
    })) return false;

    this.busy.set(true);
    return new Promise(resolve => forkJoin(items.map(item => options.update({...item, visibility}))).subscribe({
      next: () => {
        options.toast.success(`${items.length} ${items.length === 1 ? `${one} is` : `${many} are`} ${visibility.toLowerCase()} now.`);
        this.busy.set(false);
        this.clear();
        resolve(true);
      },
      error: () => {
        this.busy.set(false);
        resolve(true);
      },
    }));
  }

  /** One push for all selected entries; the backend names it after the newest. */
  sendPush(send: (ids: number[]) => Observable<{ body: string | null }>, toast: ToastService) {
    this.busy.set(true);
    send(this.ids()).subscribe({
      next: response => {
        toast.success(response.body ?? 'Push sent.');
        this.busy.set(false);
        this.clear();
      },
      error: () => this.busy.set(false),
    });
  }
}
