import {firstValueFrom, forkJoin, Observable} from 'rxjs';
import {Page} from '../../models/listing';
import {ConfirmService} from '../../core/confirm/confirm-service';
import {ToastService} from '../../services/toast-service';
import {Visibility} from '../visibility-picker/visibility-picker';

interface Publishable {
  visibility?: Visibility;
  visible?: boolean;
}

export interface PublishPrivateOptions<T extends Publishable> {
  /** Every entry matching the current filters, not only the visible page. */
  loadAll: () => Observable<Page<T>>;
  update: (item: T) => Observable<unknown>;
  /** e.g. ['post', 'posts'] */
  noun: [string, string];
  confirm: ConfirmService;
  toast: ToastService;
}

/**
 * "Make all visible": publishes every private entry matching the filters, after asking.
 * Unlisted entries are deliberately hidden from listings and stay as they are.
 * Resolves to true when something was published, so the caller can reload.
 */
export async function publishPrivate<T extends Publishable>(options: PublishPrivateOptions<T>): Promise<boolean> {
  const {items} = await firstValueFrom(options.loadAll());
  const drafts = items.filter(item => item.visibility === 'PRIVATE' || !item.visibility);
  const [singular, plural] = options.noun;

  if (drafts.length === 0) {
    options.toast.info(`No private ${plural} match these filters.`);
    return false;
  }

  const label = drafts.length === 1 ? `1 ${singular}` : `${drafts.length} ${plural}`;
  const confirmed = await options.confirm.ask({
    title: `Publish ${label}?`,
    message: `All private ${plural} matching the current filters become public on the website and in the app. Unlisted ones stay unlisted. No push is sent.`,
    confirmLabel: `Publish ${label}`,
  });
  if (!confirmed) return false;

  try {
    await firstValueFrom(forkJoin(drafts.map(item => options.update({...item, visibility: 'PUBLIC', visible: true}))));
    options.toast.success(`${label} published.`);
  } catch {
    // the interceptor named the error; some entries may have gone through, so reload either way
  }
  return true;
}
