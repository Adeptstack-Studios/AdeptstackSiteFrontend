import {Component, computed, inject, input, output} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ClipboardCheck, LucideAngularModule, MessageSquareWarning} from 'lucide-angular';
import {ReviewDetail} from '../../models/review';
import {ReviewService} from '../../services/review-service';
import {CurrentUser} from '../../core/auth/current-user';
import {ToastService} from '../../services/toast-service';
import {RelativeTimePipe} from '../ui/relative-day';

/**
 * Above an editor while a change of this entry waits for review, or was sent back. The author sees
 * their submitted version in the form and can withdraw it.
 */
@Component({
  selector: 'app-review-banner',
  imports: [RouterLink, LucideAngularModule, RelativeTimePipe],
  template: `
    @if (detail(); as open) {
      <section class="banner" [class.sent-back]="open.review.status === 'CHANGES_REQUESTED'" aria-live="polite">
        <lucide-icon [img]="open.review.status === 'CHANGES_REQUESTED' ? icons.MessageSquareWarning : icons.ClipboardCheck"
                     [size]="18" aria-hidden="true"></lucide-icon>
        <div class="text">
          @if (open.review.status === 'CHANGES_REQUESTED') {
            <strong>{{ open.review.reviewer }} asked for changes</strong>
            <p>“{{ open.review.comment }}”</p>
            <p class="c-muted">
              @if (mine()) {
                The form shows what you submitted. Change it and submit again, or withdraw it.
              } @else {
                Submitted by {{ open.review.author }}. Only they can change it.
              }
            </p>
          } @else {
            <strong>
              {{ mine() ? 'Your change is waiting for review' : open.review.author + '’s change is waiting for review' }}
            </strong>
            <p class="c-muted">
              Submitted {{ open.review.submittedAt | relativeTime }}{{ open.review.push ? ', with a push once it is live' : '' }}.
              @if (mine()) {
                The form shows your submitted version; submitting again replaces it.
              } @else {
                The live entry stays as it is until an owner approves it.
              }
            </p>
          }
        </div>
        <div class="actions">
          <a class="c-btn c-btn-sm" [routerLink]="['/reviews', open.review.id]">Open review</a>
          @if (mine()) {
            <button type="button" class="c-btn c-btn-sm" (click)="withdraw()">Withdraw</button>
          }
        </div>
      </section>
    }
  `,
  styles: `
    /* first in the editor grid, across both columns */
    :host {
      grid-column: 1 / -1;
    }

    .banner {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex-wrap: wrap;
      padding: 14px 16px;
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      background: var(--accent-soft);
    }

    .banner > lucide-icon {
      color: var(--accent-text);
      margin-top: 1px;
    }

    .sent-back {
      border-color: var(--warn);
      background: var(--warn-soft);
    }

    .sent-back > lucide-icon {
      color: var(--warn);
    }

    .text {
      flex: 1;
      min-width: 220px;
    }

    .text p {
      margin: 4px 0 0;
      font-size: 13.5px;
    }

    .actions {
      display: flex;
      gap: 8px;
    }
  `
})
export class ReviewBanner {
  private readonly reviews = inject(ReviewService);
  private readonly currentUser = inject(CurrentUser);
  private readonly toast = inject(ToastService);

  readonly detail = input<ReviewDetail | null>(null);
  readonly withdrawn = output<void>();

  protected readonly icons = {ClipboardCheck, MessageSquareWarning};
  protected readonly mine = computed(() => this.detail()?.review.author === this.currentUser.user()?.username);

  protected withdraw() {
    const open = this.detail();
    if (!open) return;
    this.reviews.withdraw(open.review.id).subscribe(() => {
      this.toast.success('Withdrawn. The live entry stays as it is.');
      this.withdrawn.emit();
    });
  }
}
