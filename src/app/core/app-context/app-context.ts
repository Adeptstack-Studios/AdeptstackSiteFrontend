import {inject, Injectable, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {Observable, tap} from 'rxjs';
import {ConsoleService} from '../../services/console-service';
import {AppSummary} from '../../models/console';

/**
 * The app whose pages are open (/apps/:slug/...). The shell reads it for the app sidebar
 * and the breadcrumb, the pages for channels and versions.
 */
@Injectable({providedIn: 'root'})
export class AppContext {
  private readonly console = inject(ConsoleService);

  readonly slug = signal<string | null>(null);
  readonly app = signal<AppSummary | null>(null);
  readonly notFound = signal(false);
  /** All apps, for the switcher in the sidebar. Loaded on first use. */
  readonly apps = signal<AppSummary[] | null>(null);

  open(slug: string) {
    if (this.slug() === slug && this.app()) return;
    this.slug.set(slug);
    this.app.set(null);
    this.notFound.set(false);
    // other failures already end in an error toast; only a missing app changes the page
    this.refresh().subscribe({error: (error: HttpErrorResponse) => this.notFound.set(error.status === 404)});
  }

  close() {
    this.slug.set(null);
    this.app.set(null);
    this.notFound.set(false);
  }

  /** Call after a change that moves counts, versions or the checklist. */
  refresh(): Observable<AppSummary> {
    const slug = this.slug();
    return this.console.app(slug ?? '').pipe(tap(app => {
      // the user may have switched apps while this was loading
      if (this.slug() === slug) this.app.set(app);
      this.apps.update(list => list?.map(other => other.id === app.id ? app : other) ?? null);
    }));
  }

  loadApps() {
    this.console.apps().subscribe(apps => this.apps.set(apps));
  }
}
