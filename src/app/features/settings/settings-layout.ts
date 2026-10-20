import {Component, computed, inject} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {History, LucideAngularModule, ShieldCheck, Users, Webhook} from 'lucide-angular';
import {CurrentUser} from '../../core/auth/current-user';

const TABS = [
  {path: 'activity', label: 'Activity log', icon: History, ownerOnly: false},
  {path: 'content-check', label: 'Content check', icon: ShieldCheck, ownerOnly: true},
  {path: 'webhooks', label: 'Webhooks', icon: Webhook, ownerOnly: true},
  {path: 'team', label: 'Team & roles', icon: Users, ownerOnly: true},
];

/** The pages that are set up once and looked at now and then, as tabs above the page. */
@Component({
  selector: 'app-settings-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule],
  template: `
    <div class="settings">
      <nav class="tabs" aria-label="Settings">
        <div class="tabs-inner">
          @for (tab of tabs(); track tab.path) {
            <a class="tab" [routerLink]="['/settings', tab.path]" routerLinkActive="active" ariaCurrentWhenActive="page">
              <lucide-icon [img]="tab.icon" [size]="16" aria-hidden="true"></lucide-icon>
              {{ tab.label }}
            </a>
          }
        </div>
      </nav>
      <div class="body">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: `
    .settings {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .tabs {
      flex: none;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tabs-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      gap: 4px;
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 10px;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      font-weight: 550;
      text-decoration: none;
      white-space: nowrap;
    }

    .tab:hover {
      color: var(--text);
    }

    .tab.active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    .tab:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
      border-radius: 6px 6px 0 0;
    }

    .body {
      flex: 1;
      min-height: 0;
    }

    @media (max-width: 760px) {
      .tabs-inner {
        padding: 0 16px;
      }
    }
  `
})
export class SettingsLayout {
  private readonly currentUser = inject(CurrentUser);

  /** everyone sees the activity log, the rest is for owners */
  protected readonly tabs = computed(() => TABS.filter(tab => !tab.ownerOnly || this.currentUser.isOwner()));
}
