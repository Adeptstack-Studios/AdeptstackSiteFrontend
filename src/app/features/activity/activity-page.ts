import {Component, computed, effect, inject, signal} from '@angular/core';
import {LucideAngularModule, X} from 'lucide-angular';
import {TeamService} from '../../services/team-service';
import {AppContext} from '../../core/app-context/app-context';
import {ACTIVITY_AREAS, ActivityEntry} from '../../models/team';
import {Pagination} from '../../pagination/pagination';
import {DEFAULT_PAGE_SIZE} from '../../models/listing';
import {ActivityList} from './activity-list';

/** Everything that happened (/activity), or only around the open app (/apps/:slug/activity). */
@Component({
  selector: 'app-activity-page',
  imports: [ActivityList, Pagination, LucideAngularModule],
  template: `
    <div class="c-scroll">
      <div class="c-page">
        <header class="c-page-head">
          <div>
            <h1>{{ context.slug() ? 'Activity' : 'Activity log' }}</h1>
            <p class="c-sub">
              @if (context.slug()) {
                Who changed what in {{ context.app()?.name ?? 'this app' }}
              } @else {
                Who changed what, newest first. Sign-ins and team changes included.
              }
            </p>
          </div>
        </header>

        <div class="c-chips filters" role="group" aria-label="Show">
          <button type="button" class="c-chip-btn" [attr.aria-pressed]="!area()" (click)="pickArea(null)">All</button>
          @for (one of areas(); track one.key) {
            <button type="button" class="c-chip-btn" [attr.aria-pressed]="area() === one.key" (click)="pickArea(one.key)">
              {{ one.label }}
            </button>
          }
          @if (actor(); as name) {
            <button type="button" class="c-chip-btn actor" (click)="pickActor(null)" [attr.aria-label]="'Show everyone, not only ' + name">
              by {{ name }} <lucide-icon [img]="icons.X" [size]="14" aria-hidden="true"></lucide-icon>
            </button>
          }
        </div>

        <section class="c-card c-card-flush" aria-label="Activity">
          @if (entries(); as list) {
            @if (list.length) {
              <app-activity-list [entries]="list" [actorClickable]="true" (actorPicked)="pickActor($event)"></app-activity-list>
              <div class="c-pager">
                <app-pagination [page]="page()" [size]="size()" [total]="total()" noun="entries"
                                (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)"/>
              </div>
            } @else {
              <p class="c-empty">Nothing here yet. From now on every change is written down.</p>
            }
          } @else {
            <div class="c-skeleton c-list-skeleton"></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .filters {
      align-items: center;
    }

    .actor {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-color: var(--accent);
    }
  `
})
export class ActivityPage {
  private readonly team = inject(TeamService);
  protected readonly context = inject(AppContext);
  protected readonly icons = {X};

  protected readonly area = signal<string | null>(null);
  protected readonly actor = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly size = signal(DEFAULT_PAGE_SIZE);
  protected readonly entries = signal<ActivityEntry[] | null>(null);
  protected readonly total = signal(0);

  /** inside an app, team changes and files never belong to it */
  protected readonly areas = computed(() =>
    this.context.slug() ? ACTIVITY_AREAS.filter(one => one.key !== 'team' && one.key !== 'files') : ACTIVITY_AREAS);

  constructor() {
    effect(() => {
      const slug = this.context.slug();
      const app = this.context.app();
      // inside an app wait for its id
      if (slug && !app) return;
      const targets = ACTIVITY_AREAS.find(one => one.key === this.area())?.targets;
      this.team.activity(this.page(), this.size(), {actor: this.actor() ?? undefined, app: app?.id, targets})
        .subscribe(page => {
          this.entries.set(page.items);
          this.total.set(page.total);
        });
    });
  }

  protected pickArea(key: string | null) {
    this.area.set(key);
    this.page.set(1);
  }

  protected pickActor(name: string | null) {
    this.actor.set(name);
    this.page.set(1);
  }
}
