import {Component, DestroyRef, effect, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {debounceTime, Subject} from 'rxjs';
import {LucideAngularModule, Plus, Search} from 'lucide-angular';
import {NewsService} from '../../../services/news-service';
import {ConsoleService} from '../../../services/console-service';
import {ToastService} from '../../../services/toast-service';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {News} from '../../../models/news';
import {AppSummary} from '../../../models/console';
import {DEFAULT_PAGE_SIZE, Facet, SortOption} from '../../../models/listing';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {Pagination} from '../../../pagination/pagination';
import {VisibilityStatus} from '../../../shared/ui/status';
import {AppTile} from '../../../shared/ui/app-tile';
import {UrlListState, VISIBILITY_FILTERS} from '../../../shared/listing/url-list';
import {Selection} from '../../../shared/listing/selection';
import {EditOnly} from '../../../shared/ui/edit-only';

/** All blog posts, filtered by category, app and visibility, with actions on several at once. */
@Component({
  selector: 'app-post-list',
  imports: [RouterLink, DatePipe, LucideAngularModule, Pagination, VisibilityStatus, AppTile, EditOnly],
  templateUrl: './post-list.html',
  styles: `
    .title-cell {
      max-width: 420px;
    }

    .summary {
      color: var(--muted);
      font-size: 12.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .app-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
  `
})
export class PostList {
  private readonly news = inject(NewsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly icons = {Plus, Search};
  protected readonly sortOptions: SortOption[] = [
    {value: 'publishedAt,desc', label: 'Newest first'},
    {value: 'publishedAt,asc', label: 'Oldest first'},
    {value: 'title,asc', label: 'Title A–Z'},
    {value: 'readingTime,asc', label: 'Quick reads first'},
    {value: 'readingTime,desc', label: 'Long reads first'},
  ];
  protected readonly visibilityOptions = VISIBILITY_FILTERS;

  protected readonly list = new UrlListState(inject(ActivatedRoute), inject(Router), {
    category: '', app: '', visibility: '', q: '', sort: 'publishedAt,desc', page: 1, size: DEFAULT_PAGE_SIZE,
  }, inject(DestroyRef));
  protected readonly selection = new Selection<News>();

  protected readonly items = signal<News[] | null>(null);
  protected readonly total = signal(0);
  protected readonly categories = signal<Facet[]>([]);
  protected readonly apps = signal<AppSummary[]>([]);

  private readonly searches = new Subject<string>();

  constructor() {
    effect(() => {
      this.list.state();
      this.load();
    });
    this.loadCategories();
    inject(ConsoleService).apps().subscribe(apps => this.apps.set(apps));

    this.searches.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(q => this.list.update({q, page: 1}));
  }

  protected allCount() {
    return this.categories().reduce((sum, category) => sum + category.count, 0);
  }

  protected iconOf(post: News) {
    return this.apps().find(app => app.id === post.appId)?.iconUrl;
  }

  protected search(value: string) {
    this.searches.next(value.trim());
  }

  protected sendPush() {
    this.selection.sendPush(ids => this.news.sendPush(ids), this.toast);
  }

  protected async setVisibility(visibility: Visibility) {
    const changed = await this.selection.setVisibility(visibility, {
      update: post => this.news.update(post),
      noun: ['post', 'posts'], confirm: this.confirm, toast: this.toast,
    });
    if (changed) {
      this.load();
      this.loadCategories();
    }
  }

  private loadCategories() {
    this.news.categories().subscribe(categories => this.categories.set(categories));
  }

  private load() {
    const state = this.list.state();
    this.news.list({
      category: state.category || undefined, app: state.app || undefined, visibility: state.visibility || undefined,
      q: state.q || undefined, sort: state.sort, page: state.page, size: state.size,
    }).subscribe(page => {
      if (!page.items.length && this.list.fixPage(page.total)) return;
      this.items.set(page.items);
      this.total.set(page.total);
    });
  }
}
