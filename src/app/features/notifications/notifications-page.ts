import {Component, inject} from '@angular/core';
import {AppContext} from '../../core/app-context/app-context';
import {PushHistory} from './push-history';

/** All pushes (/notifications), or those of the open app (/apps/:slug/notifications). */
@Component({
  selector: 'app-notifications-page',
  imports: [PushHistory],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Notifications</h1>
            <p class="c-sub">
              @if (context.slug()) {
                Pushes that announced a release of {{ context.app()?.name ?? 'this app' }}
              } @else {
                Every push to the Adeptstack app, for releases and blog posts
              }
            </p>
          </div>
        </header>
        @if (!context.slug()) {
          <app-push-history></app-push-history>
        } @else if (context.app(); as app) {
          <app-push-history [appId]="app.id" [appSlug]="app.slug" emptyText="No push for this app yet. Pushes are logged from now on."></app-push-history>
        }
      </div>
    </div>
  `
})
export class NotificationsPage {
  protected readonly context = inject(AppContext);
}
