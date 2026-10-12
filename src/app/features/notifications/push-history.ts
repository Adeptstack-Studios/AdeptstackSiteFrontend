import {Component, effect, inject, input, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {ConsoleService} from '../../services/console-service';
import {PushLogEntry} from '../../models/stats';
import {Pagination} from '../../pagination/pagination';
import {DEFAULT_PAGE_SIZE} from '../../models/listing';

/**
 * Every push that went out (or failed), newest first. With an app only those that announced
 * one of its releases. Used on /notifications and /apps/:slug/notifications.
 */
@Component({
  selector: 'app-push-history',
  imports: [DatePipe, RouterLink, Pagination],
  template: `
    <section class="c-card c-card-flush" aria-label="Sent pushes">
      @if (items(); as rows) {
        @if (rows.length) {
          <div class="c-table-wrap">
            <table class="c-table">
              <thead>
                <tr>
                  <th scope="col">Sent</th>
                  <th scope="col">Push</th>
                  <th scope="col">About</th>
                  <th scope="col">Status</th>
                  <th scope="col" class="num">Recipients</th>
                </tr>
              </thead>
              <tbody>
                @for (push of rows; track push.id) {
                  <tr>
                    <td class="c-muted when">
                      {{ push.sentAt | date: 'MMM d, y, HH:mm' }}
                      @if (push.sentBy) { <span class="by">by {{ push.sentBy }}</span> }
                    </td>
                    <td>
                      <strong>{{ push.title }}</strong>
                      @if (push.message) { <div class="c-muted message">{{ push.message }}</div> }
                    </td>
                    <td class="about">
                      @for (id of push.itemIds; track id; let last = $last) {
                        @if (push.kind === 'POST') {
                          <a class="c-link" [routerLink]="['/blog', id]">Post {{ id }}</a>
                        } @else if (appSlug()) {
                          <a class="c-link mono" [routerLink]="['/apps', appSlug(), 'releases', id]">#{{ id }}</a>
                        } @else {
                          <span class="mono">#{{ id }}</span>
                        }
                        @if (!last) { , }
                      }
                      <span class="c-chip kind">{{ push.kind === 'POST' ? 'blog' : 'release' }}</span>
                    </td>
                    <td>
                      @if (push.sent) {
                        <span class="c-status public">Sent</span>
                      } @else {
                        <span class="c-status failed" [title]="push.error ?? ''">Failed</span>
                        @if (push.error) { <div class="error">{{ push.error }}</div> }
                      }
                    </td>
                    <td class="num">{{ push.recipients ?? '–' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="c-pager">
            <app-pagination [page]="page()" [size]="size()" [total]="total()" noun="pushes"
                            (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)"/>
          </div>
        } @else {
          <p class="c-empty">{{ emptyText() }}</p>
        }
      } @else {
        <div class="c-skeleton c-list-skeleton"></div>
      }
    </section>
  `,
  styles: `
    .when {
      white-space: nowrap;
    }

    .by {
      display: block;
      font-size: 12px;
    }

    .message {
      font-size: 12.5px;
    }

    .about {
      font-size: 13px;
    }

    .kind {
      margin-left: 6px;
    }

    .failed::before {
      background: var(--danger);
    }

    .error {
      max-width: 260px;
      color: var(--danger);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
  `
})
export class PushHistory {
  private readonly console = inject(ConsoleService);

  /** only pushes for this app; all when unset */
  readonly appId = input<number | null>(null);
  /** with it, release ids link to their editor */
  readonly appSlug = input<string | null>(null);
  readonly emptyText = input('No push has been sent yet. Pushes are logged from now on.');

  protected readonly page = signal(1);
  protected readonly size = signal(DEFAULT_PAGE_SIZE);
  protected readonly items = signal<PushLogEntry[] | null>(null);
  protected readonly total = signal(0);

  constructor() {
    effect(() => {
      const app = this.appId();
      this.console.pushes(this.page(), this.size(), app ?? undefined).subscribe(page => {
        this.items.set(page.items);
        this.total.set(page.total);
      });
    });
  }
}
