import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ChevronRight, FilePen, FileText, LucideAngularModule, Plus, Store} from 'lucide-angular';
import {ConsoleService} from '../../services/console-service';
import {AuthorizationService} from '../../services/authorization';
import {AppSummary, checklistDone, ConsoleOverview} from '../../models/console';
import {AppsTable} from '../apps/apps-table/apps-table';
import {AppTile} from '../../shared/ui/app-tile';
import {ChannelChip, VisibilityStatus} from '../../shared/ui/status';
import {RelativeDayPipe} from '../../shared/ui/relative-day';

/** Something left half done, with a link to finish it. */
interface AttentionItem {
  kind: 'draft' | 'posts' | 'listing';
  title: string;
  detail: string;
  link: string[];
}

const RANGES = [7, 30, 90];
const SHOWN_APPS = 5;
const SHOWN_ATTENTION = 6;

/** Start page: the most important numbers, the apps and what needs to be done. */
@Component({
  selector: 'app-overview',
  imports: [RouterLink, LucideAngularModule, AppsTable, AppTile, ChannelChip, VisibilityStatus, RelativeDayPipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css'
})
export class Overview {
  private readonly console = inject(ConsoleService);

  protected readonly icons = {ChevronRight, FilePen, FileText, Plus, Store};
  protected readonly ranges = RANGES;
  protected readonly range = signal(30);
  protected readonly overview = signal<ConsoleOverview | null>(null);
  protected readonly apps = signal<AppSummary[] | null>(null);
  protected readonly username = signal('');

  protected readonly greeting = greeting(new Date());
  protected readonly shownApps = computed(() => (this.apps() ?? []).slice(0, SHOWN_APPS));

  protected readonly attention = computed<AttentionItem[]>(() => {
    const overview = this.overview();
    const apps = this.apps();
    if (!overview || !apps) return [];

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
      link: ['/news'],
    }] : [];
    const listings: AttentionItem[] = apps
      .filter(app => checklistDone(app) < app.checklist.length)
      .map(app => ({
        kind: 'listing',
        title: `Store listing of ${app.name}: ${checklistDone(app)} of ${app.checklist.length}`,
        detail: 'Missing: ' + app.checklist.filter(item => !item.done).map(item => item.label.toLowerCase()).join(', '),
        link: ['/apps', app.slug, 'listing'],
      }));
    return [...drafts, ...posts, ...listings];
  });
  protected readonly shownAttention = computed(() => this.attention().slice(0, SHOWN_ATTENTION));

  constructor() {
    this.load();
    this.console.apps().subscribe(apps => this.apps.set(apps));
    inject(AuthorizationService).me().subscribe(user => this.username.set(user.username ?? ''));
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
  }
}

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
