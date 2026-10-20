import {Component, computed, inject, input, output} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {Bell, FileText, FolderOpen, LucideAngularModule, Package, Store, Users} from 'lucide-angular';
import {ActivityEntry} from '../../models/team';
import {AppContext} from '../../core/app-context/app-context';
import {RelativeTimePipe} from '../../shared/ui/relative-day';

/**
 * Log lines: who, what, when, with a link to the entry while it still exists.
 * Used on the activity pages and as "Recent activity" on the overview.
 */
@Component({
  selector: 'app-activity-list',
  imports: [DatePipe, RouterLink, LucideAngularModule, RelativeTimePipe],
  template: `
    <ul class="list" [class.compact]="compact()">
      @for (entry of entries(); track entry.id) {
        <li>
          <span class="icon" [attr.data-kind]="entry.targetType" aria-hidden="true">
            <lucide-icon [img]="iconOf(entry)" [size]="15"></lucide-icon>
          </span>
          <div class="text">
            <p>
              @if (entry.actor) {
                @if (actorClickable()) {
                  <button type="button" class="actor" (click)="actorPicked.emit(entry.actor)"
                          [attr.aria-label]="'Only entries by ' + entry.actor">{{ entry.actor }}</button>
                } @else {
                  <strong>{{ entry.actor }}</strong>
                }
              } @else {
                <strong>Console</strong>
              }
              {{ ' ' }}
              @if (linkOf(entry); as link) {
                <a class="c-link" [routerLink]="link">{{ entry.summary }}</a>
              } @else {
                {{ entry.summary }}
              }
            </p>
            <time class="c-muted" [attr.datetime]="entry.at" [title]="entry.at | date: 'MMM d, y, HH:mm:ss'">
              {{ entry.at | relativeTime }}
            </time>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    li {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px 16px;
      border-top: 1px solid var(--line);
    }

    li:first-child {
      border-top: none;
    }

    .compact li {
      padding: 10px 0;
    }

    .icon {
      flex: none;
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--panel-2);
      color: var(--muted);
    }

    .icon[data-kind="RELEASE"] {
      color: var(--accent-text);
      background: var(--accent-soft);
    }

    .icon[data-kind="PUSH"] {
      color: var(--warn);
      background: var(--warn-soft);
    }

    .icon[data-kind="USER"],
    .icon[data-kind="INVITE"] {
      color: var(--good);
      background: var(--good-soft);
    }

    .text {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    p {
      margin: 0;
      overflow-wrap: anywhere;
    }

    time {
      font-size: 12px;
    }

    .actor {
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 650;
      cursor: pointer;
    }

    .actor:hover {
      text-decoration: underline;
    }
  `
})
export class ActivityList {
  private readonly context = inject(AppContext);

  readonly entries = input.required<ActivityEntry[]>();
  readonly compact = input(false);
  /** names become buttons that narrow the log to that person */
  readonly actorClickable = input(false);
  readonly actorPicked = output<string>();

  private readonly slugs = computed(() => new Map((this.context.apps() ?? []).map(app => [app.id, app.slug])));

  constructor() {
    if (!this.context.apps()) this.context.loadApps();
  }

  protected iconOf(entry: ActivityEntry) {
    switch (entry.targetType) {
      case 'RELEASE': return Package;
      case 'POST': return FileText;
      case 'APP': return Store;
      case 'PUSH': return Bell;
      case 'FILE': return FolderOpen;
      default: return Users;
    }
  }

  /** Where the entry lives now; nothing for deleted ones. */
  protected linkOf(entry: ActivityEntry): unknown[] | null {
    if (entry.action.endsWith('.deleted') || entry.targetId == null) return null;
    const slug = entry.appId == null ? null : this.slugs().get(entry.appId);
    switch (entry.targetType) {
      case 'RELEASE': return slug ? ['/apps', slug, 'releases', entry.targetId] : null;
      case 'POST': return ['/blog', entry.targetId];
      case 'APP': return slug ? ['/apps', slug] : null;
      case 'PUSH': return slug ? ['/apps', slug, 'notifications'] : ['/notifications'];
      // sign-ins and team changes have nothing to open
      default: return null;
    }
  }
}
