import {Component, computed, DestroyRef, effect, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Params, Router, RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {debounceTime, forkJoin, Subject} from 'rxjs';
import {LucideAngularModule, Plus, Search} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ChangelogsService} from '../../../services/changelogs-service';
import {ToastService} from '../../../services/toast-service';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {Changelogs} from '../../../models/changelogs';
import {DEFAULT_PAGE_SIZE, Facet, PAGE_SIZES, SortOption} from '../../../models/listing';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {Pagination} from '../../../pagination/pagination';
import {ChannelChip, VisibilityStatus} from '../../../shared/ui/status';

/** The filters live in the URL, so a filtered list can be bookmarked and the back button works. */
interface ListState {
  channel: string;
  visibility: string;
  q: string;
  sort: string;
  page: number;
  size: number;
}

const DEFAULT_SORT = 'publishedAt,desc';

/** All releases of one app, filtered by channel and visibility, with actions on several at once. */
@Component({
  selector: 'app-release-list',
  imports: [RouterLink, DatePipe, LucideAngularModule, Pagination, ChannelChip, VisibilityStatus],
  templateUrl: './release-list.html',
  styleUrl: './release-list.css'
})
export class ReleaseList {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly changelogs = inject(ChangelogsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly context = inject(AppContext);

  protected readonly icons = {Plus, Search};
  protected readonly sortOptions: SortOption[] = [
    {value: 'publishedAt,desc', label: 'Newest first'},
    {value: 'publishedAt,asc', label: 'Oldest first'},
    {value: 'version,desc', label: 'Highest version'},
    {value: 'version,asc', label: 'Lowest version'},
    {value: 'title,asc', label: 'Title A–Z'},
  ];
  protected readonly visibilityOptions = [
    {value: '', label: 'All'}, {value: 'PUBLIC', label: 'Public'},
    {value: 'UNLISTED', label: 'Unlisted'}, {value: 'PRIVATE', label: 'Private'},
  ];

  protected readonly state = signal<ListState>(readState({}));
  protected readonly items = signal<Changelogs[] | null>(null);
  protected readonly total = signal(0);
  protected readonly channels = signal<Facet[]>([]);
  protected readonly allCount = computed(() => this.channels().reduce((sum, channel) => sum + channel.count, 0));

  /** Selected releases by id; kept across pages so a push can cover several pages. */
  protected readonly selected = signal(new Map<number, Changelogs>());
  protected readonly busy = signal(false);
  protected readonly allOnPageSelected = computed(() =>
    !!this.items()?.length && this.items()!.every(item => this.selected().has(item.id!)));
  protected readonly someOnPageSelected = computed(() =>
    !this.allOnPageSelected() && !!this.items()?.some(item => this.selected().has(item.id!)));

  private readonly searches = new Subject<string>();

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.state.set(readState(Object.fromEntries(params.keys.map(key => [key, params.get(key)]))));
    });

    // load whenever the app or the filters change
    effect(() => {
      const slug = this.context.slug();
      const state = this.state();
      if (slug) this.load(slug, state);
    });
    effect(() => {
      const slug = this.context.slug();
      if (slug) this.changelogs.channels(slug).subscribe(channels => this.channels.set(channels));
    });

    this.searches.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(q => this.update({q, page: 1}));
    inject(DestroyRef).onDestroy(() => this.searches.complete());
  }

  protected update(change: Partial<ListState>) {
    const next = {...this.state(), ...change};
    const queryParams: Params = {
      channel: next.channel || null,
      visibility: next.visibility || null,
      q: next.q || null,
      sort: next.sort === DEFAULT_SORT ? null : next.sort,
      page: next.page > 1 ? next.page : null,
      size: next.size === DEFAULT_PAGE_SIZE ? null : next.size,
    };
    this.router.navigate([], {relativeTo: this.route, queryParams});
  }

  protected search(value: string) {
    this.searches.next(value.trim());
  }

  protected toggle(item: Changelogs) {
    this.selected.update(selected => {
      const next = new Map(selected);
      if (next.has(item.id!)) next.delete(item.id!); else next.set(item.id!, item);
      return next;
    });
  }

  protected togglePage() {
    const items = this.items() ?? [];
    const select = !this.allOnPageSelected();
    this.selected.update(selected => {
      const next = new Map(selected);
      for (const item of items) {
        if (select) next.set(item.id!, item); else next.delete(item.id!);
      }
      return next;
    });
  }

  protected clearSelection() {
    this.selected.set(new Map());
  }

  protected sendPush() {
    const ids = [...this.selected().keys()];
    this.busy.set(true);
    this.changelogs.sendPush(ids).subscribe({
      next: response => {
        this.toast.success(response.body ?? 'Push sent.');
        this.busy.set(false);
        this.clearSelection();
      },
      error: () => this.busy.set(false),
    });
  }

  protected async setVisibility(visibility: Visibility) {
    const items = [...this.selected().values()].filter(item => item.visibility !== visibility);
    if (!items.length) {
      this.toast.info(`The selected releases are already ${visibility.toLowerCase()}.`);
      return;
    }
    if (visibility === 'PUBLIC') {
      const ok = await this.confirm.ask({
        title: `Publish ${items.length} ${items.length === 1 ? 'release' : 'releases'}?`,
        message: 'They will be listed on adeptstack.net and in the app. No push is sent.',
        confirmLabel: 'Publish',
      });
      if (!ok) return;
    }

    this.busy.set(true);
    forkJoin(items.map(item => this.changelogs.update({...item, visibility}))).subscribe({
      next: () => {
        this.toast.success(`${items.length} ${items.length === 1 ? 'release is' : 'releases are'} ${visibility.toLowerCase()} now.`);
        this.busy.set(false);
        this.clearSelection();
        this.load(this.context.slug()!, this.state());
        this.context.refresh().subscribe();
      },
      error: () => {
        this.busy.set(false);
        this.load(this.context.slug()!, this.state());
      },
    });
  }

  private load(slug: string, state: ListState) {
    this.changelogs.list({
      app: slug, channel: state.channel || undefined, visibility: state.visibility || undefined,
      q: state.q || undefined, sort: state.sort, page: state.page, size: state.size,
    }).subscribe(page => {
      // a filter or a change emptied the page: go to the last one that exists
      const lastPage = Math.max(1, Math.ceil(page.total / state.size));
      if (!page.items.length && state.page > lastPage) {
        this.update({page: lastPage});
        return;
      }
      this.items.set(page.items);
      this.total.set(page.total);
    });
  }
}

function readState(params: Record<string, string | null>): ListState {
  const page = Number(params['page']);
  const size = Number(params['size']);
  return {
    channel: params['channel'] ?? '',
    visibility: (params['visibility'] ?? '').toUpperCase(),
    q: params['q'] ?? '',
    sort: params['sort'] ?? DEFAULT_SORT,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
  };
}
