import {Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {ArrowLeft, LucideAngularModule} from 'lucide-angular';
import {ReviewService} from '../../services/review-service';
import {CurrentUser} from '../../core/auth/current-user';
import {ToastService} from '../../services/toast-service';
import {AppContext} from '../../core/app-context/app-context';
import {actionLabel, ReviewDetail} from '../../models/review';
import {RelativeTimePipe} from '../../shared/ui/relative-day';
import {ReviewChip} from '../../shared/review/review-chip';
import {ReviewChanges} from './review-changes';
import {FindingList} from './finding-list';

/** One submitted change: what it does, what the content check found, and the decision. */
@Component({
  selector: 'app-review-page',
  imports: [RouterLink, FormsModule, LucideAngularModule, DatePipe, RelativeTimePipe, ReviewChip, ReviewChanges, FindingList],
  template: `
    <div class="c-scroll">
      @if (detail(); as d) {
        <header class="c-editor-bar">
          <a class="c-btn c-editor-back" routerLink="/reviews" aria-label="Back to reviews">
            <lucide-icon [img]="icons.ArrowLeft" [size]="17" aria-hidden="true"></lucide-icon>
          </a>
          <div class="c-editor-title">
            <h1>{{ action() }}: {{ d.review.title }}</h1>
            <p class="c-sub">by {{ d.review.author }}, {{ d.review.submittedAt | relativeTime }}</p>
          </div>
          <app-review-chip [status]="d.review.status"></app-review-chip>
        </header>

        <div class="c-editor-layout">
          <div class="c-editor-main">
            <section class="c-card" aria-labelledby="changes-heading">
              <div class="c-card-head">
                <h2 id="changes-heading">What changes</h2>
                @if (entryLink(); as link) {
                  <a class="c-link" [routerLink]="link">Open in the editor</a>
                }
              </div>
              <app-review-changes [detail]="d"></app-review-changes>
            </section>

            @if (d.review.action === 'UPDATE') {
              <section class="c-card" aria-labelledby="check-heading">
                <div class="c-card-head">
                  <h2 id="check-heading">Content check</h2>
                  <p class="c-sub">{{ d.findings.length ? d.findings.length + (d.findings.length === 1 ? ' hint' : ' hints') + ' to look at' : 'Nothing found' }}</p>
                </div>
                @if (d.findings.length) {
                  <app-finding-list [findings]="d.findings"></app-finding-list>
                } @else {
                  <p class="c-muted none">No listed words and no links to sites that are new here.</p>
                }
              </section>
            }
          </div>

          <aside class="c-editor-side">
            <section class="c-card" aria-labelledby="decision-heading">
              <div class="c-card-head"><h2 id="decision-heading">Decision</h2></div>
              @switch (d.review.status) {
                @case ('PENDING') {
                  @if (d.canApprove) {
                    <label class="c-label" for="comment">Comment</label>
                    <textarea id="comment" class="c-input comment" rows="3" [(ngModel)]="comment"
                              placeholder="Needed when you ask for changes"></textarea>
                    <div class="buttons">
                      <button type="button" class="c-btn c-btn-primary" [disabled]="busy()" (click)="approve()">{{ approveLabel() }}</button>
                      <button type="button" class="c-btn" [disabled]="busy()" (click)="requestChanges()">Ask for changes</button>
                    </div>
                  } @else {
                    <p class="c-muted note">{{ d.cannotApproveReason }}</p>
                  }
                }
                @case ('CHANGES_REQUESTED') {
                  <p class="note"><strong>{{ d.review.reviewer }}</strong> asked for changes
                    {{ d.review.reviewedAt | relativeTime }}:</p>
                  <p class="quote">{{ d.review.comment }}</p>
                  <p class="c-muted note">{{ mine() ? 'Change it in the editor and submit again.' : d.review.author + ' can change it and submit again.' }}</p>
                }
                @case ('APPROVED') {
                  <p class="note"><strong>{{ d.review.reviewer }}</strong> approved it
                    <span [title]="d.review.reviewedAt | date: 'MMM d, y, HH:mm'">{{ d.review.reviewedAt | relativeTime }}</span>.</p>
                  @if (d.review.comment) { <p class="quote">{{ d.review.comment }}</p> }
                  @if (d.review.error) { <p class="error">{{ d.review.error }}</p> }
                }
                @case ('WITHDRAWN') {
                  <p class="c-muted note">Withdrawn {{ d.review.reviewedAt | relativeTime }}. Nothing changed on the website.</p>
                }
              }
              @if (mine() && (d.review.status === 'PENDING' || d.review.status === 'CHANGES_REQUESTED')) {
                <button type="button" class="c-btn withdraw" [disabled]="busy()" (click)="withdraw()">Withdraw my change</button>
              }
            </section>

            <section class="c-card" aria-labelledby="facts-heading">
              <div class="c-card-head"><h2 id="facts-heading">Details</h2></div>
              <dl class="facts">
                <dt>Submitted</dt>
                <dd>{{ d.review.submittedAt | date: 'MMM d, y, HH:mm' }}</dd>
                <dt>By</dt>
                <dd>{{ d.review.author }}</dd>
                @if (d.review.kind === 'RELEASE' || d.review.kind === 'POST') {
                  <dt>Push</dt>
                  <dd>{{ d.review.push ? 'once it is live' : d.payload?.['plan'] === true ? 'as planned, see above' : 'no' }}</dd>
                }
              </dl>
            </section>
          </aside>
        </div>
      } @else if (missing()) {
        <div class="c-page"><p class="c-empty">This review does not exist. <a routerLink="/reviews">All reviews</a></p></div>
      } @else {
        <div class="c-page"><div class="c-card"><div class="c-skeleton" style="height: 240px"></div></div></div>
      }
    </div>
  `,
  styles: `
    .c-editor-bar app-review-chip {
      margin-left: auto;
    }

    .comment {
      height: auto;
      padding: 8px 12px;
      resize: vertical;
    }

    .buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .note {
      margin: 0 0 8px;
      font-size: 13.5px;
    }

    .quote {
      margin: 0 0 10px;
      padding: 8px 10px;
      border-left: 3px solid var(--warn);
      background: var(--panel-2);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      white-space: pre-wrap;
    }

    .error {
      margin: 0;
      color: var(--danger);
      font-size: 13px;
    }

    .withdraw {
      margin-top: 12px;
    }

    .none {
      margin: 0;
    }

    .facts {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 8px 16px;
      margin: 0;
      font-size: 13.5px;
    }

    .facts dt {
      color: var(--muted);
    }

    .facts dd {
      margin: 0;
    }
  `
})
export class ReviewPage {
  private readonly reviews = inject(ReviewService);
  private readonly currentUser = inject(CurrentUser);
  private readonly toast = inject(ToastService);
  private readonly context = inject(AppContext);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly icons = {ArrowLeft};
  protected readonly detail = signal<ReviewDetail | null>(null);
  protected readonly missing = signal(false);
  protected readonly busy = signal(false);
  protected comment = '';

  protected readonly action = computed(() => {
    const d = this.detail();
    return d ? actionLabel(d) : '';
  });
  protected readonly approveLabel = computed(() => ({
    Publish: 'Approve and publish', Plan: 'Approve plan', Delete: 'Approve and delete', Push: 'Approve and send',
    Newsletter: 'Approve and send', 'Take offline': 'Approve and take offline',
  } as Record<string, string>)[this.action()] ?? 'Approve');
  protected readonly mine = computed(() => this.detail()?.review.author === this.currentUser.user()?.username);

  /** where the entry is edited, while it exists */
  protected readonly entryLink = computed(() => {
    const review = this.detail()?.review;
    if (!review?.targetId || review.action === 'DELETE' && review.status === 'APPROVED') return null;
    const slug = (this.context.apps() ?? []).find(app => app.id === review.appId)?.slug;
    switch (review.kind) {
      case 'RELEASE': return slug ? ['/apps', slug, 'releases', review.targetId] : null;
      case 'POST': return ['/blog', review.targetId];
      case 'APP': return slug ? ['/apps', slug, 'listing'] : null;
      default: return null;
    }
  });

  constructor() {
    if (!this.context.apps()) this.context.loadApps();
    this.load();
  }

  protected approve() {
    this.busy.set(true);
    this.reviews.approve(this.id, this.comment).subscribe({
      next: review => {
        this.busy.set(false);
        if (review.error) this.toast.error(review.error);
        else this.toast.success(this.action() === 'Delete' ? 'Approved and deleted.' : 'Approved. It is live now.');
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  protected requestChanges() {
    if (!this.comment.trim()) {
      this.toast.error('Write in the comment what should change.');
      return;
    }
    this.busy.set(true);
    this.reviews.requestChanges(this.id, this.comment).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Sent back with your comment.');
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  protected withdraw() {
    this.busy.set(true);
    this.reviews.withdraw(this.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Withdrawn. The website stays as it is.');
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  private load() {
    this.reviews.detail(this.id).subscribe({
      next: detail => {
        this.detail.set(detail);
        this.comment = '';
      },
      error: () => this.missing.set(true),
    });
  }
}
