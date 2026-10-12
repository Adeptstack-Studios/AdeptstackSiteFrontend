import {Component, computed, input} from '@angular/core';
import {compact} from './chart-series';

export interface ShareItem {
  name: string;
  value: number;
}

/** A ranking with a bar each, e.g. the most visited pages or visitors by browser. */
@Component({
  selector: 'app-share-list',
  template: `
    @if (items().length) {
      <ul>
        @for (item of items(); track item.name) {
          <li>
            <div class="row">
              <span class="name" [class.mono]="mono()" [title]="item.name">{{ item.name }}</span>
              <span class="value">{{ compact(item.value) }}@if (showPercent()) {<span class="percent"> · {{ percent(item.value) }}%</span>}</span>
            </div>
            <span class="bar" aria-hidden="true"><span [style.width.%]="100 * item.value / max()" [style.background]="color()"></span></span>
          </li>
        }
      </ul>
    } @else {
      <p class="empty">{{ emptyText() }}</p>
    }
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 4px;
      font-size: 13px;
    }

    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .value {
      flex: none;
      font-family: var(--font-mono);
      font-size: 12.5px;
    }

    .percent {
      color: var(--muted);
    }

    .bar {
      display: block;
      height: 5px;
      border-radius: 999px;
      background: var(--panel-2);
      overflow: hidden;
    }

    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
    }

    .empty {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }
  `
})
export class ShareList {
  readonly items = input.required<ShareItem[]>();
  readonly color = input('var(--accent)');
  readonly mono = input(false);
  readonly showPercent = input(false);
  readonly emptyText = input('Nothing counted yet.');

  protected readonly compact = compact;
  protected readonly max = computed(() => Math.max(1, ...this.items().map(item => item.value)));
  private readonly total = computed(() => this.items().reduce((sum, item) => sum + item.value, 0));

  protected percent(value: number) {
    return Math.round(100 * value / Math.max(1, this.total()));
  }
}
