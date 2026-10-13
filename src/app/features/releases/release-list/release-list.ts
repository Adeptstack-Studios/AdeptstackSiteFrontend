import {Component, DestroyRef, effect, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {debounceTime, Subject} from 'rxjs';
import {LucideAngularModule, Plus, Search} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ChangelogsService} from '../../../services/changelogs-service';
import {ToastService} from '../../../services/toast-service';
import {ConfirmService} from '../../../core/confirm/confirm-service';
import {Changelogs} from '../../../models/changelogs';
import {DEFAULT_PAGE_SIZE, Facet, SortOption} from '../../../models/listing';
import {Visibility} from '../../../shared/visibility-picker/visibility-picker';
import {Pagination} from '../../../pagination/pagination';
import {ChannelChip, VisibilityStatus} from '../../../shared/ui/status';
import {UrlListState, VISIBILITY_FILTERS} from '../../../shared/listing/url-list';
import {Selection} from '../../../shared/listing/selection';
import {isUpcoming} from '../../../shared/ui/relative-day';
import {EditOnly} from '../../../shared/ui/edit-only';
import {ReviewService} from '../../../services/review-service';
import {ReviewStatus} from '../../../models/review';
import {ReviewChip} from '../../../shared/review/review-chip';
import {formatMoment} from '../../../shared/time';

/** All releases of one app, filtered by channel and visibility, with actions on several at once. */
@Component({
  selector: 'app-release-list',
  imports: [RouterLink, DatePipe, LucideAngularModule, Pagination, ChannelChip, VisibilityStatus, EditOnly, ReviewChip],
  templateUrl: './release-list.html',
})
export class ReleaseList {
  private readonly reviews = inject(ReviewService);
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
  protected readonly visibilityOptions = VISIBILITY_FILTERS;

  protected readonly list = new UrlListState(inject(ActivatedRoute), inject(Router), {
    channel: '', visibility: '', q: '', sort: 'publishedAt,desc', page: 1, size: DEFAULT_PAGE_SIZE,
  }, inject(DestroyRef));
  protected readonly selection = new Selection<Changelogs>();
  protected readonly isUpcoming = isUpcoming;
  protected readonly moment = (value: string | null | undefined) => formatMoment(value, {hideMidnight: true});

  protected readonly items = signal<Changelogs[] | null>(null);
  protected readonly total = signal(0);
  protected readonly channels = signal<Facet[]>([]);

  private readonly searches = new Subject<string>();

  constructor() {
    // load whenever the app or the filters change
    effect(() => {
      const slug = this.context.slug();
      this.list.state();
      if (slug) this.load();
    });
    effect(() => {
      const slug = this.context.slug();
      if (slug) this.changelogs.channels(slug).subscribe(channels => this.channels.set(channels));
    });

    this.searches.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(q => this.list.update({q, page: 1}));
  }

  protected allCount() {
    return this.channels().reduce((sum, channel) => sum + channel.count, 0);
  }

  protected search(value: string) {
    this.searches.next(value.trim());
  }

  protected sendPush() {
    this.selection.sendPush(ids => this.changelogs.sendPush(ids), this.toast);
  }

  protected async setVisibility(visibility: Visibility) {
    const changed = await this.selection.setVisibility(visibility, {
      update: item => this.changelogs.update(item),
      noun: ['release', 'releases'], confirm: this.confirm, toast: this.toast,
    });
    if (changed) {
      this.load();
      this.context.refresh().subscribe();
    }
  }

  /** open reviews by entry, for the chip next to the visibility */
  protected readonly inReview = signal(new Map<number, ReviewStatus>());

  private loadReviews() {
    this.reviews.openOf('RELEASE').subscribe(open =>
      this.inReview.set(new Map(open.filter(review => review.targetId !== null).map(review => [review.targetId!, review.status]))));
  }

  private load() {
    this.loadReviews();
    const state = this.list.state();
    this.changelogs.list({
      app: this.context.slug()!, channel: state.channel || undefined, visibility: state.visibility || undefined,
      q: state.q || undefined, sort: state.sort, page: state.page, size: state.size,
    }).subscribe(page => {
      if (!page.items.length && this.list.fixPage(page.total)) return;
      this.items.set(page.items);
      this.total.set(page.total);
    });
  }
}
