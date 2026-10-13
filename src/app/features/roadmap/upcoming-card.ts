import {Component, effect, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ConsoleService} from '../../services/console-service';
import {RoadmapItem} from '../../models/roadmap';
import {RoadmapEntry} from './roadmap-entry';

/** "Upcoming": the next releases and posts, on the overview (all apps) and an app's dashboard. */
@Component({
  selector: 'app-upcoming-card',
  imports: [RouterLink, RoadmapEntry],
  template: `
    <section class="c-card c-card-flush" aria-labelledby="upcoming-heading">
      <div class="c-card-head pad">
        <h2 id="upcoming-heading">Upcoming</h2>
        <a class="c-link" routerLink="/roadmap">Open the roadmap</a>
      </div>
      @if (items(); as list) {
        @if (list.length) {
          <ul class="entries">
            @for (item of list; track item.kind + item.id) {
              <li><app-roadmap-entry [item]="item"></app-roadmap-entry></li>
            }
          </ul>
        } @else {
          <p class="c-empty">Nothing planned yet. Plan a release in its editor: Publishing → Plan.</p>
        }
      } @else {
        <div class="c-skeleton skeleton"></div>
      }
    </section>
  `,
  styles: `
    .pad {
      padding: 16px 16px 0;
      margin-bottom: 8px;
    }

    .entries {
      list-style: none;
      margin: 0;
      padding: 0 0 6px;
    }

    .entries > li + li {
      border-top: 1px solid var(--line);
    }

    .skeleton {
      height: 120px;
      margin: 0 16px 16px;
    }
  `
})
export class UpcomingCard {
  private readonly console = inject(ConsoleService);

  /** an app's id or slug; all apps when empty */
  readonly app = input<string | null>(null);
  readonly limit = input(5);
  protected readonly items = signal<RoadmapItem[] | null>(null);

  constructor() {
    effect(() => {
      const app = this.app();
      this.console.roadmap({app: app ?? undefined, from: new Date().toISOString(), limit: this.limit()})
        .subscribe(items => this.items.set(items));
    });
  }
}
