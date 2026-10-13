import {Component, computed, effect, inject, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {map} from 'rxjs';
import {Bell, FileText, LucideAngularModule, Mail, Package, Store} from 'lucide-angular';
import {ReviewFilter, ReviewService} from '../../services/review-service';
import {CurrentUser} from '../../core/auth/current-user';
import {ReviewSummary} from '../../models/review';
import {Pagination} from '../../pagination/pagination';
import {DEFAULT_PAGE_SIZE} from '../../models/listing';
import {RelativeTimePipe} from '../../shared/ui/relative-day';
import {ReviewChip} from '../../shared/review/review-chip';

const TABS: { filter: ReviewFilter; label: string; empty: string }[] = [
  {filter: 'open', label: 'Waiting', empty: 'Nothing is waiting for a review.'},
  {filter: 'changes', label: 'Sent back', empty: 'No change was sent back.'},
  {filter: 'mine', label: 'Mine', empty: 'You have no open changes.'},
  {filter: 'done', label: 'Done', empty: 'Nothing was approved or withdrawn yet.'},
];

/** Everything that waits for an owner, was sent back, or is done. */
@Component({
  selector: 'app-review-list-page',
  imports: [RouterLink, LucideAngularModule, Pagination, RelativeTimePipe, ReviewChip],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Reviews</h1>
            <p class="c-sub">
              @if (currentUser.isOwner()) {
                Changes go live once an owner approves them. Nobody approves their own, unless they are the only owner.
              } @else {
                Your changes go live once an owner approves them.
              }
            </p>
          </div>
        </header>

        <div class="c-chips" role="group" aria-label="Show">
          @for (tab of tabs; track tab.filter) {
            <button type="button" class="c-chip-btn" [attr.aria-pressed]="filter() === tab.filter" (click)="pick(tab.filter)">
              {{ tab.label }}
              @if (tab.filter === 'open' && reviews.counts()?.pending) { <span class="n">{{ reviews.counts()!.pending }}</span> }
              @if (tab.filter === 'changes' && reviews.counts()?.changesRequested) { <span class="n">{{ reviews.counts()!.changesRequested }}</span> }
            </button>
          }
        </div>

        <section class="c-card c-card-flush" aria-label="Changes">
          @if (items(); as rows) {
            @if (rows.length) {
              <div class="c-table-wrap">
                <table class="c-table">
                  <thead>
                    <tr>
                      <th scope="col">Change</th>
                      <th scope="col">By</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Check</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (review of rows; track review.id) {
                      <tr>
                        <td>
                          <a class="change" [routerLink]="['/reviews', review.id]">
                            <lucide-icon [img]="iconOf(review)" [size]="16" aria-hidden="true"></lucide-icon>
                            <span>
                              <strong>{{ review.title }}</strong>
                              <span class="c-muted what">{{ what(review) }}</span>
                            </span>
                          </a>
                        </td>
                        <td>{{ review.author }}</td>
                        <td class="c-muted">{{ review.submittedAt | relativeTime }}</td>
                        <td class="c-muted">{{ review.hints ? review.hints + (review.hints === 1 ? ' hint' : ' hints') : '–' }}</td>
                        <td><app-review-chip [status]="review.status"></app-review-chip></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="c-pager">
                <app-pagination [page]="page()" [size]="size()" [total]="total()" noun="changes"
                                (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)"/>
              </div>
            } @else {
              <p class="c-empty">{{ emptyText() }}</p>
            }
          } @else {
            <div class="c-skeleton c-list-skeleton"></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .change {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      color: inherit;
      text-decoration: none;
    }

    .change:hover strong {
      text-decoration: underline;
    }

    .change lucide-icon {
      margin-top: 2px;
      color: var(--muted);
    }

    .change > span {
      display: flex;
      flex-direction: column;
    }

    .what {
      font-size: 12.5px;
    }
  `
})
export class ReviewListPage {
  protected readonly reviews = inject(ReviewService);
  protected readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = TABS;
  protected readonly filter = toSignal(this.route.queryParamMap.pipe(
    map(params => (TABS.some(tab => tab.filter === params.get('filter')) ? params.get('filter') : 'open') as ReviewFilter)),
    {initialValue: 'open' as ReviewFilter});
  protected readonly page = signal(1);
  protected readonly size = signal(DEFAULT_PAGE_SIZE);
  protected readonly items = signal<ReviewSummary[] | null>(null);
  protected readonly total = signal(0);
  protected readonly emptyText = computed(() => TABS.find(tab => tab.filter === this.filter())!.empty);

  constructor() {
    this.reviews.refreshCounts();
    effect(() => {
      this.reviews.list(this.filter(), this.page(), this.size()).subscribe(page => {
        this.items.set(page.items);
        this.total.set(page.total);
      });
    });
  }

  protected pick(filter: ReviewFilter) {
    this.items.set(null);
    this.page.set(1);
    this.router.navigate([], {queryParams: {filter: filter === 'open' ? null : filter}, replaceUrl: true});
  }

  protected iconOf(review: ReviewSummary) {
    switch (review.kind) {
      case 'RELEASE': return Package;
      case 'POST': return FileText;
      case 'APP': return Store;
      case 'PUSH': return Bell;
      default: return Mail;
    }
  }

  protected what(review: ReviewSummary) {
    if (review.action === 'DELETE') return 'Delete';
    if (review.kind === 'PUSH') return 'Push notification';
    if (review.kind === 'NEWSLETTER') return 'Newsletter';
    const noun = review.kind === 'RELEASE' ? 'Release' : review.kind === 'POST' ? 'Blog post' : 'Store listing';
    return noun + (review.push ? ', with a push' : '');
  }
}
