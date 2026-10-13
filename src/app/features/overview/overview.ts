import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ChevronRight, ClipboardCheck, FilePen, FileText, LucideAngularModule, Plus, Store} from 'lucide-angular';
import {ConsoleService} from '../../services/console-service';
import {TeamService} from '../../services/team-service';
import {CurrentUser} from '../../core/auth/current-user';
import {ActivityEntry} from '../../models/team';
import {ActivityList} from '../activity/activity-list';
import {AppSummary, checklistDone, ConsoleOverview} from '../../models/console';
import {StatsOverview, trend} from '../../models/stats';
import {KpiCard} from '../../shared/charts/kpi-card';
import {DayChart} from '../../shared/charts/day-chart';
import {ShareList} from '../../shared/charts/share-list';
import {compact} from '../../shared/charts/chart-series';
import {AppsTable} from '../apps/apps-table/apps-table';
import {AppTile} from '../../shared/ui/app-tile';
import {ChannelChip, VisibilityStatus} from '../../shared/ui/status';
import {RelativeDayPipe} from '../../shared/ui/relative-day';
import {ReviewService} from '../../services/review-service';
import {UpcomingCard} from '../roadmap/upcoming-card';

/** Something left half done, with a link to finish it. */
interface AttentionItem {
  kind: 'draft' | 'posts' | 'listing' | 'review';
  title: string;
  detail: string;
  link: string[];
  query?: Record<string, string>;
}

const RANGES = [7, 30, 90];
const SHOWN_APPS = 5;
const SHOWN_ATTENTION = 6;
const SHOWN_ACTIVITY = 6;

/** Start page: the most important numbers, the apps and what needs to be done. */
@Component({
  selector: 'app-overview',
  imports: [RouterLink, LucideAngularModule, AppsTable, AppTile, ChannelChip, VisibilityStatus, RelativeDayPipe,
    KpiCard, DayChart, ShareList, ActivityList, UpcomingCard],
  templateUrl: './overview.html',
  styleUrl: './overview.css'
})
export class Overview {
  private readonly console = inject(ConsoleService);

  protected readonly icons = {ChevronRight, FilePen, FileText, Plus, Store, ClipboardCheck};
  protected readonly ranges = RANGES;
  protected readonly range = signal(30);
  protected readonly overview = signal<ConsoleOverview | null>(null);
  protected readonly stats = signal<StatsOverview | null>(null);
  protected readonly compact = compact;
  protected readonly trend = trend;

  protected readonly chartDays = computed(() => this.stats()?.days.map(day => day.day) ?? []);
  protected readonly chartSeries = computed(() => {
    const days = this.stats()?.days ?? [];
    return [
      {label: 'Page views', color: 'var(--accent)', values: days.map(day => day.views)},
      {label: 'Downloads', color: 'var(--beta)', values: days.map(day => day.downloads)},
    ];
  });
  protected readonly topPages = computed(() =>
    (this.stats()?.topPages ?? []).slice(0, 6).map(page => ({name: page.path, value: page.views})));
  protected readonly apps = signal<AppSummary[] | null>(null);
  protected readonly currentUser = inject(CurrentUser);
  private readonly reviews = inject(ReviewService);
  protected readonly username = computed(() => this.currentUser.user()?.username ?? '');
  protected readonly activity = signal<ActivityEntry[] | null>(null);

  protected readonly greeting = greeting(new Date());
  protected readonly shownApps = computed(() => (this.apps() ?? []).slice(0, SHOWN_APPS));

  protected readonly attention = computed<AttentionItem[]>(() => {
    const overview = this.overview();
    const apps = this.apps();
    if (!overview || !apps) return [];

    const counts = this.reviews.counts();
    const reviews: AttentionItem[] = [];
    if (counts?.pending && this.currentUser.isOwner()) {
      reviews.push({
        kind: 'review',
        title: `${counts.pending} ${counts.pending === 1 ? 'change waits' : 'changes wait'} for your review`,
        detail: 'Nothing goes live before an owner approves it',
        link: ['/reviews'],
      });
    }
    if (counts?.changesRequested) {
      reviews.push({
        kind: 'review',
        title: `${counts.changesRequested} of your changes ${counts.changesRequested === 1 ? 'was' : 'were'} sent back`,
        detail: 'Read the comment, change it and submit again',
        link: ['/reviews'],
        query: {filter: 'mine'},
      });
    }

    const drafts: AttentionItem[] = overview.draftReleases.map(release => ({
      kind: 'draft',
      title: `${release.appName ?? 'Release'} ${release.version}`,
      detail: `Draft in ${release.channel}, not published yet`,
      link: ['/apps', release.appSlug!, 'releases', String(release.id)],
    }));
    const posts: AttentionItem[] = overview.draftPosts ? [{
      kind: 'posts',
      title: `${overview.draftPosts} blog ${overview.draftPosts === 1 ? 'post is' : 'posts are'} still private`,
      detail: 'Publish or delete them on the blog page',
      link: ['/blog'],
      query: {visibility: 'PRIVATE'},
    }] : [];
    const listings: AttentionItem[] = apps
      .filter(app => checklistDone(app) < app.checklist.length)
      .map(app => ({
        kind: 'listing',
        title: `Store listing of ${app.name}: ${checklistDone(app)} of ${app.checklist.length}`,
        detail: 'Missing: ' + app.checklist.filter(item => !item.done).map(item => item.label.toLowerCase()).join(', '),
        link: ['/apps', app.slug, 'listing'],
      }));
    return [...reviews, ...drafts, ...posts, ...listings];
  });
  protected readonly shownAttention = computed(() => this.attention().slice(0, SHOWN_ATTENTION));

  constructor() {
    this.load();
    this.console.apps().subscribe(apps => this.apps.set(apps));
    inject(TeamService).activity(1, SHOWN_ACTIVITY).subscribe(page => this.activity.set(page.items));
  }

  /** Release lists only carry the app id; the icon comes from the apps loaded anyway. */
  protected iconOf(appId: number | null) {
    return this.apps()?.find(app => app.id === appId)?.iconUrl;
  }

  protected setRange(days: number) {
    if (days === this.range()) return;
    this.range.set(days);
    this.load();
  }

  private load() {
    this.console.overview(this.range()).subscribe(overview => this.overview.set(overview));
    this.console.stats(this.range()).subscribe(stats => this.stats.set(stats));
  }
}

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
