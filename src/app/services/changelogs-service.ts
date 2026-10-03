import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {Changelogs} from '../models/changelogs';
import {Facet, Page, toHttpParams, toPage} from '../models/listing';
import {environment} from '../../environments/environment';

/** Filters for the changelog listing. Leave page and size out to get every match. */
export interface ChangelogListQuery {
  app?: number;
  channel?: string;
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

  create(c: Changelogs): Observable<HttpResponse<Changelogs>> {
    return this.http.post<Changelogs>(environment.changelogsCreate, c, { observe: 'response' });
  }

  update(c: Changelogs): Observable<HttpResponse<Changelogs>> {
    return this.http.put<Changelogs>(environment.changelogsUpdate + "/" + c.id, c, { observe: 'response' });
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

  /** Sends one push for the given changelogs, named after the newest of them. */
  sendPush(ids: number[]): Observable<HttpResponse<string>> {
    return this.http.post(environment.changelogsPush, { ids }, { observe: 'response', responseType: 'text' });
  }

  getById(id: number): Observable<HttpResponse<Changelogs>> {
    return this.http.get<Changelogs>(environment.changelogsGetById + id, { observe: 'response' });
  }

  /** Filtered, sorted and paged by the backend. As admin this includes private entries. */
  list(query: ChangelogListQuery): Observable<Page<Changelogs>> {
    const params = toHttpParams({
      app: query.app, channel: query.channel, q: query.q, sort: query.sort,
      page: query.page !== undefined ? query.page - 1 : undefined, size: query.size,
    });
    return this.http.get<Changelogs[]>(environment.changelogsGetAll, { observe: 'response', params }).pipe(map(toPage));
  }

  /** Channels in use with their changelog count, optionally only for one app. */
  channels(app?: number): Observable<Facet[]> {
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
