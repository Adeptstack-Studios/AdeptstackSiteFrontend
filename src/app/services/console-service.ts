import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {AppSummary, ConsoleOverview, LinkSuggestion} from '../models/console';
import {toHttpParams} from '../models/listing';

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

  /** Per link field the newest value the app used, for the release assistant. */
  linkSuggestions(idOrSlug: string | number): Observable<LinkSuggestion[]> {
    return this.http.get<LinkSuggestion[]>(`${environment.appsBase}/${encodeURIComponent(idOrSlug)}/link-suggestions`);
  }
}
