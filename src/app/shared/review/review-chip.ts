import {Component, input} from '@angular/core';
import {ReviewStatus, STATUS_LABELS} from '../../models/review';

/** "In review", "Changes requested", ... as a small status chip. */
@Component({
  selector: 'app-review-chip',
  template: `<span class="chip" [attr.data-status]="status()">{{ labels[status()] }}</span>`,
  styles: `
    :host {
      display: inline-block;
      margin-left: 6px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 550;
      white-space: nowrap;
    }

    .chip[data-status="CHANGES_REQUESTED"] {
      background: var(--warn-soft);
      color: var(--warn);
    }

    .chip[data-status="APPROVED"] {
      background: var(--good-soft);
      color: var(--good);
    }

    .chip[data-status="SCHEDULED"] {
      background: var(--warn-soft);
      color: var(--warn);
    }

    .chip[data-status="WITHDRAWN"] {
      background: var(--panel-2);
      color: var(--muted);
    }
  `
})
export class ReviewChip {
  readonly status = input.required<ReviewStatus>();
  protected readonly labels = STATUS_LABELS;
}
