import {Component, computed, effect, inject, signal} from '@angular/core';
import {ConsoleService} from '../../services/console-service';
import {StatsOverview, TARGET_LABELS, trend} from '../../models/stats';
import {DayChart} from '../../shared/charts/day-chart';
import {ShareList} from '../../shared/charts/share-list';
import {KpiCard} from '../../shared/charts/kpi-card';
import {compact} from '../../shared/charts/chart-series';
import {RangePicker} from './range-picker';

const TRAITS = [
  {key: 'os', title: 'Systems'},
  {key: 'browser', title: 'Browsers'},
  {key: 'device', title: 'Devices'},
  {key: 'referrer', title: 'Sources'},
  {key: 'language', title: 'Languages'},
];

/** Everything counted on adeptstack.net: views, visitors by trait, downloads and store clicks. */
@Component({
  selector: 'app-stats-page',
  imports: [DayChart, ShareList, KpiCard, RangePicker],
  templateUrl: './stats-page.html',
  styles: `
    .traits {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .legend {
      display: flex;
      gap: 14px;
      color: var(--muted);
      font-size: 13px;
    }

    .legend span::before {
      content: "";
      display: inline-block;
      width: 10px;
      height: 3px;
      margin-right: 6px;
      vertical-align: middle;
      border-radius: 2px;
      background: var(--dot);
    }

    .note {
      margin: 0;
      color: var(--muted);
      font-size: 12.5px;
    }

    .chart-skeleton {
      height: 220px;
    }
  `
})
export class StatsPage {
  private readonly console = inject(ConsoleService);

  protected readonly range = signal(30);
  protected readonly stats = signal<StatsOverview | null>(null);
  protected readonly traits = TRAITS;
  protected readonly compact = compact;
  protected readonly trend = trend;

  protected readonly days = computed(() => this.stats()?.days.map(day => day.day) ?? []);
  protected readonly series = computed(() => {
    const days = this.stats()?.days ?? [];
    return [
      {label: 'Page views', color: 'var(--accent)', values: days.map(day => day.views)},
      {label: 'Downloads', color: 'var(--beta)', values: days.map(day => day.downloads)},
      {label: 'Store clicks', color: '#A78BFA', values: days.map(day => day.storeClicks)},
    ];
  });
  protected readonly pages = computed(() =>
    (this.stats()?.topPages ?? []).map(page => ({name: page.path, value: page.views})));
  protected readonly targets = computed(() =>
    (this.stats()?.targets ?? []).map(target => ({name: TARGET_LABELS[target.target] ?? target.target, value: target.total})));

  constructor() {
    effect(() => {
      const range = this.range();
      this.console.stats(range).subscribe(stats => this.stats.set(stats));
    });
  }

  protected trait(key: string) {
    return (this.stats()?.visitorsBy[key] ?? []).map(share => ({name: share.name, value: share.visitors}));
  }
}
