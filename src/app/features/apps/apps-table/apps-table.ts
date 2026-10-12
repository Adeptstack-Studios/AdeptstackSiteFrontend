import {Component, inject, input} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {AppChannel, AppSummary} from '../../../models/console';
import {channelKind} from '../../../shared/versions';
import {AppTile} from '../../../shared/ui/app-tile';
import {VisibilityStatus} from '../../../shared/ui/status';
import {RelativeDayPipe} from '../../../shared/ui/relative-day';
import {PlatformsPipe} from '../../../shared/ui/platforms';

/** The main and the beta channel of an app, for the two version columns. */
export function mainAndBeta(app: AppSummary): { main?: AppChannel; beta?: AppChannel } {
  const beta = app.channels.find(channel => channelKind(channel.name) === 'beta');
  // channels are ordered busiest first; a stable-like one wins, else the busiest that is no beta
  const main = app.channels.find(channel => channelKind(channel.name) === 'stable')
    ?? app.channels.find(channel => channel !== beta);
  return {main, beta};
}

/** Apps with status, versions, releases and downloads. A row opens the app. */
@Component({
  selector: 'app-apps-table',
  imports: [RouterLink, AppTile, VisibilityStatus, RelativeDayPipe, PlatformsPipe],
  templateUrl: './apps-table.html',
  styles: `
    .app-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 200px;
    }

    .app-name {
      color: var(--text);
      font-weight: 600;
      text-decoration: none;
    }

    .app-sub {
      color: var(--muted);
      font-size: 12.5px;
    }

    .beta-version {
      color: var(--muted);
    }
  `
})
export class AppsTable {
  private readonly router = inject(Router);

  readonly apps = input.required<AppSummary[]>();

  protected readonly mainAndBeta = mainAndBeta;

  protected open(app: AppSummary, event: MouseEvent) {
    // the name is a real link; a click anywhere else in the row does the same
    if ((event.target as HTMLElement).closest('a')) return;
    this.router.navigate(['/apps', app.slug]);
  }
}
