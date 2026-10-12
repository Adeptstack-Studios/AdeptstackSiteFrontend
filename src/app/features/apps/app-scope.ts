import {Component, DestroyRef, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, RouterLink, RouterOutlet} from '@angular/router';
import {AppContext} from '../../core/app-context/app-context';

/** Parent route of /apps/:slug: opens the app for the shell and the pages below. */
@Component({
  selector: 'app-app-scope',
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (context.notFound()) {
      <div class="c-scroll">
        <div class="c-page">
          <div class="c-card c-empty">
            <p>There is no app at <span class="mono">/apps/{{ context.slug() }}</span>.</p>
            <a class="c-btn" routerLink="/apps">All apps</a>
          </div>
        </div>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: `:host { display: block; height: 100%; }`
})
export class AppScope {
  protected readonly context = inject(AppContext);

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed())
      .subscribe(params => this.context.open(params.get('slug')!));
    inject(DestroyRef).onDestroy(() => this.context.close());
  }
}
