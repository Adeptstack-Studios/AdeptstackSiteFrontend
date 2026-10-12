import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AppContext} from '../../core/app-context/app-context';
import {ConsoleService} from '../../services/console-service';
import {AppStats, TARGET_LABELS, trend} from '../../models/stats';
import {DayChart} from '../../shared/charts/day-chart';
import {ShareList} from '../../shared/charts/share-list';
import {KpiCard} from '../../shared/charts/kpi-card';
import {compact} from '../../shared/charts/chart-series';
import {ChannelChip} from '../../shared/ui/status';
import {RangePicker} from './range-picker';

/** One app: views of its product page, downloads by source and per release, mod downloads. */
@Component({
  selector: 'app-app-stats-page',
  imports: [RouterLink, DayChart, ShareList, KpiCard, ChannelChip, RangePicker],
  templateUrl: './app-stats-page.html',
  styles: `
    .legend {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 13px;
    }

    .legend span::before {
      content: "";
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 6px;
      vertical-align: -1px;
      border-radius: 2px;
      background: var(--dot);
    }

    .skeleton {
      height: 220px;
    }
  `
})
export class AppStatsPage {
  private readonly console = inject(ConsoleService);
  protected readonly context = inject(AppContext);

  protected readonly range = signal(30);
  protected readonly stats = signal<AppStats | null>(null);
  protected readonly compact = compact;
  protected readonly trend = trend;

  protected readonly days = computed(() => this.stats()?.days.map(day => day.day) ?? []);
  protected readonly views = computed(() => this.stats()?.days.map(day => day.views) ?? []);
  /** stacked: own downloads, store clicks and, for mods, downloads won on Modrinth and CurseForge */
  protected readonly sources = computed(() => {
    const stats = this.stats();
    const days = stats?.days ?? [];
    const series = [
      {label: 'Direct download', color: 'var(--beta)', values: days.map(day => day.downloads)},
      {label: 'Store clicks', color: 'var(--accent)', values: days.map(day => day.storeClicks)},
    ];
    if (stats?.modDownloadsGained !== null && stats?.modDownloadsGained !== undefined) {
      series.push({label: 'Modrinth + CurseForge', color: 'var(--good)', values: days.map(day => day.modDownloads)});
    }
    return series;
  });
  protected readonly targets = computed(() =>
    (this.stats()?.targets ?? []).map(target => ({name: TARGET_LABELS[target.target] ?? target.target, value: target.total})));
  /** downloads and store clicks per product page view */
  protected readonly rate = computed(() => {
    const totals = this.stats()?.totals;
    if (!totals?.views) return null;
    return Math.round(100 * (totals.downloads + totals.storeClicks) / totals.views);
  });

  constructor() {
    effect(() => {
      const slug = this.context.slug();
      const range = this.range();
      if (slug) this.console.appStats(slug, range).subscribe(stats => this.stats.set(stats));
    });
  }
}
