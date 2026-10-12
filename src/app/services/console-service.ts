import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {AppSummary, ConsoleOverview, LinkSuggestion} from '../models/console';
import {Page, toHttpParams, toPage} from '../models/listing';
import {AppStats, NewsletterStatus, PushLogEntry, StatsOverview} from '../models/stats';

/** Read-only summaries made for the console; they include private entries. */
@Injectable({
  providedIn: 'root'
})
export class ConsoleService {
  private readonly http = inject(HttpClient);

  /** @param range days that count as "recently published" */
  overview(range: number): Observable<ConsoleOverview> {
    return this.http.get<ConsoleOverview>(environment.consoleOverview, {params: toHttpParams({range})});
  }

  /** All apps, the one with the latest release first. */
  apps(): Observable<AppSummary[]> {
    return this.http.get<AppSummary[]>(environment.consoleApps);
  }

  app(idOrSlug: string | number): Observable<AppSummary> {
    return this.http.get<AppSummary>(`${environment.consoleApps}/${encodeURIComponent(idOrSlug)}`);
  }

  /** Page views, visitors by trait, downloads and store clicks of the last range days. */
  stats(range: number): Observable<StatsOverview> {
    return this.http.get<StatsOverview>(environment.consoleStats, {params: toHttpParams({range})});
  }

  appStats(idOrSlug: string | number, range: number): Observable<AppStats> {
    return this.http.get<AppStats>(`${environment.consoleStats}/apps/${encodeURIComponent(idOrSlug)}`,
      {params: toHttpParams({range})});
  }

  /** Sent pushes, newest first; with app only those announcing one of its releases. page is 1-based. */
  pushes(page: number, size: number, app?: number): Observable<Page<PushLogEntry>> {
    return this.http.get<PushLogEntry[]>(environment.consolePushes,
      {observe: 'response', params: toHttpParams({app, page: page - 1, size})}).pipe(map(toPage));
  }

  newsletter(): Observable<NewsletterStatus> {
    return this.http.get<NewsletterStatus>(environment.consoleNewsletter);
  }

  /** Per link field the newest value the app used, for the release assistant. */
  linkSuggestions(idOrSlug: string | number): Observable<LinkSuggestion[]> {
    return this.http.get<LinkSuggestion[]>(`${environment.appsBase}/${encodeURIComponent(idOrSlug)}/link-suggestions`);
  }
}
