import {Component, computed, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Bell, BellRing, FileText, LucideAngularModule} from 'lucide-angular';
import {ROADMAP_STATUS, roadmapLink, RoadmapItem} from '../../models/roadmap';
import {AppTile} from '../../shared/ui/app-tile';
import {ChannelChip} from '../../shared/ui/status';
import {formatMoment} from '../../shared/time';

/** One line of the roadmap: when, what, its status, coming soon and the pushes. */
@Component({
  selector: 'app-roadmap-entry',
  imports: [RouterLink, LucideAngularModule, AppTile, ChannelChip],
  template: `
    @let entry = item();
    <a class="entry" [routerLink]="link()">
      <span class="when">
        <span class="day">{{ day() }}</span>
        <span class="time">{{ time() }}</span>
      </span>
      @if (entry.kind === 'RELEASE') {
        <app-tile [name]="entry.appName ?? ''" [iconUrl]="entry.appIconUrl" [size]="30"></app-tile>
      } @else {
        <span class="post-icon" aria-hidden="true"><lucide-icon [img]="icons.FileText" [size]="15"></lucide-icon></span>
      }
      <span class="what">
        <span class="title">
          @if (entry.kind === 'RELEASE') {
            <strong>{{ entry.appName }}</strong> <span class="c-version">{{ entry.version }}</span>
            @if (entry.channel) { <app-channel-chip [name]="entry.channel"></app-channel-chip> }
          } @else {
            <strong>{{ entry.title }}</strong>
            @if (entry.appName) { <span class="c-muted">· {{ entry.appName }}</span> }
          }
        </span>
        <span class="details">
          @for (detail of details(); track $index) {
            <span class="detail">
              @if (detail.push) {
                <lucide-icon [img]="detail.sent ? icons.BellRing : icons.Bell" [size]="12" aria-hidden="true"></lucide-icon>
              }
              {{ detail.text }}
            </span>
          }
        </span>
      </span>
      <span class="status" [attr.data-tone]="status().tone">{{ status().label }}</span>
    </a>
  `,
  styles: `
    .entry {
      display: grid;
      grid-template-columns: 92px auto minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 10px 16px;
      color: inherit;
      text-decoration: none;
    }

    .entry:hover {
      background: var(--panel-2);
    }

    .when {
      display: flex;
      flex-direction: column;
      font-variant-numeric: tabular-nums;
    }

    .day {
      font-weight: 600;
      font-size: 13.5px;
    }

    .time {
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .post-icon {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: var(--panel-2);
      color: var(--muted);
    }

    .what {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .details {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      color: var(--muted);
      font-size: 12.5px;
    }

    .detail {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .status {
      padding: 2px 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      background: var(--panel-2);
      color: var(--muted);
    }

    .status[data-tone="accent"] {
      background: var(--accent-soft);
      color: var(--accent-text);
    }

    .status[data-tone="warn"] {
      background: var(--warn-soft);
      color: var(--warn);
    }

    .status[data-tone="good"] {
      background: var(--good-soft);
      color: var(--good);
    }

    .status[data-tone="beta"] {
      background: color-mix(in srgb, var(--beta, var(--warn)) 16%, transparent);
      color: var(--beta, var(--warn));
    }

    @media (max-width: 640px) {
      .entry {
        grid-template-columns: auto minmax(0, 1fr);
        row-gap: 6px;
      }

      .when {
        grid-column: 1 / -1;
        flex-direction: row;
        gap: 8px;
      }

      .status {
        grid-column: 2;
        justify-self: start;
      }
    }
  `
})
export class RoadmapEntry {
  readonly item = input.required<RoadmapItem>();

  protected readonly icons = {Bell, BellRing, FileText};
  protected readonly link = computed(() => roadmapLink(this.item()));
  protected readonly status = computed(() => ROADMAP_STATUS[this.item().status]);
  protected readonly day = computed(() => new Date(this.item().at)
    .toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'}));
  protected readonly time = computed(() => {
    const date = new Date(this.item().at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });

  /** coming soon, the pushes (planned or sent) and who approved the plan */
  protected readonly details = computed(() => {
    const item = this.item();
    const details: { text: string; push?: boolean; sent?: boolean }[] = [];
    if (item.comingSoonAt && item.status !== 'LIVE') {
      details.push({text: `coming soon ${new Date(item.comingSoonAt) <= new Date() ? 'since' : 'from'} ${formatMoment(item.comingSoonAt)}`});
    }
    if (item.comingSoonPush) {
      details.push({text: item.comingSoonPushedAt ? 'coming soon push sent' : 'coming soon push planned',
        push: true, sent: !!item.comingSoonPushedAt});
    }
    if (item.push) {
      const at = item.kind === 'RELEASE' ? 'release' : 'publish';
      details.push({text: item.pushedAt ? `${at} push sent` : `${at} push planned`, push: true, sent: !!item.pushedAt});
    }
    if (item.planned && item.approvedBy) details.push({text: `plan approved by ${item.approvedBy}`});
    else if (item.planned && item.status !== 'LIVE') details.push({text: 'plan waits for approval'});
    return details;
  });
}
