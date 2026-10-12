import {Component, inject, signal} from '@angular/core';
import {LucideAngularModule, Mail} from 'lucide-angular';
import {ConsoleService} from '../../services/console-service';
import {NewsletterStatus} from '../../models/stats';
import {KpiCard} from '../../shared/charts/kpi-card';

/** Subscribers in numbers and whether signing up is open. The addresses themselves are never shown here. */
@Component({
  selector: 'app-newsletter-page',
  imports: [LucideAngularModule, KpiCard],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>Newsletter</h1>
            <p class="c-sub">Subscribers and sign-up</p>
          </div>
        </header>

        @if (status(); as s) {
          <section class="c-card status" [class.closed]="!s.signupOpen">
            <lucide-icon [img]="icons.Mail" [size]="20" aria-hidden="true"></lucide-icon>
            <div>
              @if (s.signupOpen) {
                <strong>Signing up is open.</strong>
                <p class="c-muted">New subscribers get a confirmation mail first.</p>
              } @else {
                <strong>Signing up is paused until sending starts.</strong>
                <p class="c-muted">
                  OneSignal has not unlocked e-mail yet, so the website shows "starts soon" instead of the form.
                  To open it later, set <span class="mono">APP_NEWSLETTER_SIGNUP_OPEN=true</span> on the backend and
                  describe the newsletter in the privacy policy.
                </p>
              }
            </div>
          </section>

          <section class="c-grid-2" aria-label="Subscribers">
            <app-kpi-card label="Confirmed" color="var(--good)" [value]="s.confirmed"
                          note="Clicked the link in the confirmation mail"></app-kpi-card>
            <app-kpi-card label="Waiting for confirmation" color="var(--warn)" [value]="s.unconfirmed"
                          note="Signed up, but never confirmed"></app-kpi-card>
          </section>
        } @else {
          <div class="c-card"><div class="c-skeleton" style="height: 120px"></div></div>
        }
      </div>
    </div>
  `,
  styles: `
    .status {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      border-color: var(--good);
      background: var(--good-soft);
    }

    .status lucide-icon {
      color: var(--good);
      margin-top: 2px;
    }

    .status.closed {
      border-color: var(--warn);
      background: var(--warn-soft);
    }

    .status.closed lucide-icon {
      color: var(--warn);
    }

    .status p {
      margin: 4px 0 0;
    }
  `
})
export class NewsletterPage {
  protected readonly icons = {Mail};
  protected readonly status = signal<NewsletterStatus | null>(null);

  constructor() {
    inject(ConsoleService).newsletter().subscribe(status => this.status.set(status));
  }
}
