import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Check, CircleAlert, LucideAngularModule, Plus, Store} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ChangelogsService} from '../../../services/changelogs-service';
import {NewsService} from '../../../services/news-service';
import {AppChannel, checklistDone} from '../../../models/console';
import {Changelogs} from '../../../models/changelogs';
import {News} from '../../../models/news';
import {channelKind, compareVersions} from '../../../shared/versions';
import {AppTile} from '../../../shared/ui/app-tile';
import {ChannelChip, VisibilityStatus} from '../../../shared/ui/status';
import {isUpcoming} from '../../../shared/ui/relative-day';
import {DatePipe} from '@angular/common';
import {ConsoleService} from '../../../services/console-service';
import {AppStats, trend} from '../../../models/stats';
import {KpiCard} from '../../../shared/charts/kpi-card';
import {DayChart} from '../../../shared/charts/day-chart';
import {compact} from '../../../shared/charts/chart-series';

const CHANNEL_HINTS: Record<string, string> = {stable: 'Everyone gets this', beta: 'Opt-in testers'};

/** One app at a glance: its channels like the tracks of the Play Console, latest releases, store listing. */
@Component({
  selector: 'app-app-dashboard',
  imports: [RouterLink, LucideAngularModule, AppTile, ChannelChip, VisibilityStatus, DatePipe, KpiCard, DayChart],
  templateUrl: './app-dashboard.html',
  styleUrl: './app-dashboard.css'
})
export class AppDashboard {
  private readonly changelogs = inject(ChangelogsService);
  private readonly news = inject(NewsService);
  protected readonly context = inject(AppContext);

  protected readonly icons = {Check, CircleAlert, Plus, Store};
  protected readonly latest = signal<Changelogs[] | null>(null);
  protected readonly posts = signal<News[] | null>(null);
  protected readonly stats = signal<AppStats | null>(null);
  protected readonly compact = compact;
  protected readonly trend = trend;

  protected readonly days = computed(() => this.stats()?.days.map(day => day.day) ?? []);
  protected readonly views = computed(() => this.stats()?.days.map(day => day.views) ?? []);
  protected readonly sources = computed(() => {
    const stats = this.stats();
    const days = stats?.days ?? [];
    const series = [
      {label: 'Direct download', color: 'var(--beta)', values: days.map(day => day.downloads)},
      {label: 'Store clicks', color: 'var(--accent)', values: days.map(day => day.storeClicks)},
    ];
    if (stats && stats.modDownloadsGained !== null) {
      series.push({label: 'Modrinth + CurseForge', color: 'var(--good)', values: days.map(day => day.modDownloads)});
    }
    return series;
  });
  /** downloads and store clicks per product page view */
  protected readonly rate = computed(() => {
    const totals = this.stats()?.totals;
    return totals?.views ? Math.round(100 * (totals.downloads + totals.storeClicks) / totals.views) : null;
  });
  private readonly console = inject(ConsoleService);
  protected readonly checklistDone = checklistDone;
  protected readonly isUpcoming = isUpcoming;

  /** The beta channel whose newest version is ahead of the main one, ready to be promoted. */
  protected readonly promotable = computed(() => {
    const channels = this.context.app()?.channels ?? [];
    const main = channels.find(channel => channelKind(channel.name) === 'stable');
    const beta = channels.find(channel => channelKind(channel.name) === 'beta');
    if (!main || !beta) return null;
    const betaCore = beta.latest.version.split('-')[0];
    return compareVersions(betaCore, main.latest.version) > 0 ? {main, beta} : null;
  });

  constructor() {
    // reload the release list whenever another app is opened
    effect(() => {
      const slug = this.context.slug();
      if (!slug) return;
      this.latest.set(null);
      this.changelogs.list({app: slug, sort: 'publishedAt,desc', page: 1, size: 5})
        .subscribe(page => this.latest.set(page.items));
      this.stats.set(null);
      this.console.appStats(slug, 30).subscribe(stats => this.stats.set(stats));
      this.posts.set(null);
      this.news.list({app: slug, sort: 'publishedAt,desc', page: 1, size: 4})
        .subscribe(page => this.posts.set(page.items));
    });
  }

  protected hint(channel: AppChannel) {
    return CHANNEL_HINTS[channelKind(channel.name)] ?? '';
  }
}
