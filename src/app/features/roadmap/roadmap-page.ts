import {Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ConsoleService} from '../../services/console-service';
import {AppContext} from '../../core/app-context/app-context';
import {RoadmapItem} from '../../models/roadmap';
import {RoadmapEntry} from './roadmap-entry';

const DAY = 24 * 60 * 60 * 1000;
/** how far back the page starts, and how much each "Show earlier" adds */
const PAST_DAYS = 60;

interface Month {
  label: string;
  items: RoadmapItem[];
  /** the "today" line goes before this item's index */
  todayBefore: number | null;
}

/** Everything by the moment it comes out: what was out lately, what is coming soon, planned or a draft. */
@Component({
  selector: 'app-roadmap-page',
  imports: [FormsModule, RoadmapEntry],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Roadmap</h1>
            <p class="c-sub">Releases and posts by the moment they come out, past and ahead</p>
          </div>
        </header>

        <div class="c-filters">
          <div class="c-chips" role="group" aria-label="Show">
            <button type="button" class="c-chip-btn" [attr.aria-pressed]="kind() === ''" (click)="kind.set('')">All</button>
            <button type="button" class="c-chip-btn" [attr.aria-pressed]="kind() === 'RELEASE'" (click)="kind.set('RELEASE')">Releases</button>
            <button type="button" class="c-chip-btn" [attr.aria-pressed]="kind() === 'POST'" (click)="kind.set('POST')">Blog</button>
          </div>
          <div class="c-filter-fields">
            <label class="sr-only" for="roadmap-app">App</label>
            <select id="roadmap-app" class="c-input select" [ngModel]="app()" (ngModelChange)="pickApp($event)">
              <option value="">All apps</option>
              @for (one of context.apps() ?? []; track one.id) {
                <option [value]="one.slug">{{ one.name }}</option>
              }
            </select>
          </div>
        </div>

        <section class="c-card c-card-flush" aria-label="Timeline">
          @if (items() === null) {
            <div class="c-skeleton c-list-skeleton"></div>
          } @else {
            <div class="earlier">
              <button type="button" class="c-btn c-btn-sm" (click)="showEarlier()">Show earlier</button>
              <span class="c-muted">from {{ fromLabel() }}</span>
            </div>
            @for (month of months(); track month.label) {
              <h2 class="month">{{ month.label }}</h2>
              <ul class="entries">
                @for (item of month.items; track item.kind + item.id; let index = $index) {
                  @if (month.todayBefore === index) {
                    <li class="today" aria-label="Today"><span>Today</span></li>
                  }
                  <li><app-roadmap-entry [item]="item"></app-roadmap-entry></li>
                }
                @if (month.todayBefore === month.items.length) {
                  <li class="today" aria-label="Today"><span>Today</span></li>
                }
              </ul>
            } @empty {
              <p class="c-empty">Nothing in this time. Plan a release in its editor: Publishing → Plan.</p>
            }
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .select {
      width: auto;
      min-width: 160px;
    }

    .earlier {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }

    .month {
      margin: 0;
      padding: 14px 16px 6px;
      font-size: 13px;
      font-weight: 650;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .entries {
      list-style: none;
      margin: 0;
      padding: 0 0 8px;
    }

    .entries > li + li {
      border-top: 1px solid var(--line);
    }

    .today {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 16px;
      color: var(--accent-text);
      font-size: 12px;
      font-weight: 650;
      border-top: none !important;
    }

    .today::after {
      content: "";
      flex: 1;
      height: 2px;
      border-radius: 2px;
      background: var(--accent);
    }

    .today + li {
      border-top: none !important;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `
})
export class RoadmapPage {
  private readonly console = inject(ConsoleService);
  protected readonly context = inject(AppContext);

  protected readonly kind = signal<'' | 'RELEASE' | 'POST'>('');
  protected readonly app = signal('');
  private readonly pastDays = signal(PAST_DAYS);
  protected readonly items = signal<RoadmapItem[] | null>(null);

  protected readonly fromLabel = computed(() => new Date(Date.now() - this.pastDays() * DAY)
    .toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}));

  /** by month, with the line for today where the past ends */
  protected readonly months = computed<Month[]>(() => {
    const kind = this.kind();
    const now = Date.now();
    const months: Month[] = [];
    let todayPlaced = false;
    for (const item of (this.items() ?? []).filter(one => !kind || one.kind === kind)) {
      const at = new Date(item.at);
      const label = at.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
      let month = months.at(-1);
      if (!month || month.label !== label) {
        month = {label, items: [], todayBefore: null};
        months.push(month);
      }
      if (!todayPlaced && at.getTime() > now) {
        month.todayBefore = month.items.length;
        todayPlaced = true;
      }
      month.items.push(item);
    }
    // everything is in the past: the line closes the last month
    if (!todayPlaced && months.length) months.at(-1)!.todayBefore = months.at(-1)!.items.length;
    return months;
  });

  constructor() {
    if (!this.context.apps()) this.context.loadApps();
    this.load();
  }

  protected pickApp(slug: string) {
    this.app.set(slug);
    this.load();
  }

  protected showEarlier() {
    this.pastDays.update(days => days + 180);
    this.load();
  }

  private load() {
    const from = new Date(Date.now() - this.pastDays() * DAY).toISOString();
    this.console.roadmap({app: this.app() || undefined, from}).subscribe(items => this.items.set(items));
  }
}
