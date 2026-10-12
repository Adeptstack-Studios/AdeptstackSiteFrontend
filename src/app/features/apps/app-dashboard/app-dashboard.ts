import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Check, CircleAlert, LucideAngularModule, Plus, Store} from 'lucide-angular';
import {AppContext} from '../../../core/app-context/app-context';
import {ChangelogsService} from '../../../services/changelogs-service';
import {AppChannel, checklistDone} from '../../../models/console';
import {Changelogs} from '../../../models/changelogs';
import {channelKind, compareVersions} from '../../../shared/versions';
import {AppTile} from '../../../shared/ui/app-tile';
import {ChannelChip, VisibilityStatus} from '../../../shared/ui/status';
import {RelativeDayPipe} from '../../../shared/ui/relative-day';
import {DatePipe} from '@angular/common';

const CHANNEL_HINTS: Record<string, string> = {stable: 'Everyone gets this', beta: 'Opt-in testers'};

/** One app at a glance: its channels like the tracks of the Play Console, latest releases, store listing. */
@Component({
  selector: 'app-app-dashboard',
  imports: [RouterLink, LucideAngularModule, AppTile, ChannelChip, VisibilityStatus, RelativeDayPipe, DatePipe],
  templateUrl: './app-dashboard.html',
  styleUrl: './app-dashboard.css'
})
export class AppDashboard {
  private readonly changelogs = inject(ChangelogsService);
  protected readonly context = inject(AppContext);

  protected readonly icons = {Check, CircleAlert, Plus, Store};
  protected readonly latest = signal<Changelogs[] | null>(null);
  protected readonly checklistDone = checklistDone;

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
    });
  }

  protected channelNames(channels: AppChannel[]) {
    return channels.map(channel => channel.name).join(', ');
  }

  protected hint(channel: AppChannel) {
    return CHANNEL_HINTS[channelKind(channel.name)] ?? '';
  }
}
