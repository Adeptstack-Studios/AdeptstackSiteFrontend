import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {Changelogs} from '../models/changelogs';
import {Facet, Page, toHttpParams, toPage} from '../models/listing';
import {environment} from '../../environments/environment';
import {ReviewSummary} from '../models/review';

/** Filters for the changelog listing. Leave page and size out to get every match. */
export interface ChangelogListQuery {
  /** id or slug */
  app?: number | string;
  channel?: string;
  /** PUBLIC, UNLISTED or PRIVATE */
  visibility?: string;
  q?: string;
  /** e.g. "version,desc" */
  sort?: string;
  /** 1-based */
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChangelogsService {
  http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }

  /** A draft is saved (201); going live is submitted for review instead (202 with the submission). */
  create(c: Changelogs, push = false): Observable<HttpResponse<Changelogs>> {
    return this.http.post<Changelogs>(environment.changelogsCreate, c, { observe: 'response', params: { push } });
  }

  /** push: send the push once the release is live. 202 when the change was submitted for review. */
  update(c: Changelogs, push = false): Observable<HttpResponse<Changelogs>> {
    return this.http.put<Changelogs>(environment.changelogsUpdate + "/" + c.id, c, { observe: 'response', params: { push } });
  }

  deleteById(id: number): Observable<HttpResponse<Changelogs>> {
    return this.http.delete<Changelogs>(environment.changelogsDelete + "/" + id, { observe: 'response' });
  }

  search(query: string): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.searchChangelogs + query, { observe: 'response' });
  }

  searchBy(app: string, query: string): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.searchByChangelogs + app + "&title=" + query, { observe: 'response' });
  }

  /** Submits one push for the given changelogs for review; it is named after the newest of them. */
  sendPush(ids: number[]): Observable<HttpResponse<ReviewSummary>> {
    return this.http.post<ReviewSummary>(environment.changelogsPush, { ids }, { observe: 'response' });
  }

  getById(id: number): Observable<HttpResponse<Changelogs>> {
    return this.http.get<Changelogs>(environment.changelogsGetById + id, { observe: 'response' });
  }

  /** Filtered, sorted and paged by the backend. As admin this includes private entries. */
  list(query: ChangelogListQuery): Observable<Page<Changelogs>> {
    const params = toHttpParams({
      app: query.app, channel: query.channel, visibility: query.visibility, q: query.q, sort: query.sort,
      page: query.page !== undefined ? query.page - 1 : undefined, size: query.size,
    });
    return this.http.get<Changelogs[]>(environment.changelogsGetAll, { observe: 'response', params }).pipe(map(toPage));
  }

  /** Channels in use with their changelog count, optionally only for one app. */
  channels(app?: number | string): Observable<Facet[]> {
    return this.http.get<Facet[]>(environment.changelogsChannels, { params: toHttpParams({ app }) });
  }

  getAll(): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.changelogsGetAll, { observe: 'response' });
  }

  getAllByApp(app: string): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.changelogsGetByApp + app, { observe: 'response' });
  }

  getLatestByAppByChannel(app: string, channel: string): Observable<HttpResponse<Changelogs>> {
    return this.http.get<Changelogs>(environment.changelogsGetLatestByAppByChannel + app + "&channel=" + channel, { observe: 'response' });
  }
}
