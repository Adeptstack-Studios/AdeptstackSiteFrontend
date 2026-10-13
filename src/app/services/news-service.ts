import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {News} from '../models/news';
import {Facet, Page, toHttpParams, toPage} from '../models/listing';
import {ReviewSummary} from '../models/review';

/** Filters for the news listing. Leave page and size out to get every match. */
export interface NewsListQuery {
  category?: string;
  /** linked app, id or slug */
  app?: number | string;
  /** PUBLIC, UNLISTED or PRIVATE */
  visibility?: string;
  q?: string;
  /** e.g. "readingTime,desc" */
  sort?: string;
  /** 1-based */
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }

  /** A draft is saved (201); going live is submitted for review instead (202 with the submission). */
  create(n: News, push = false): Observable<HttpResponse<News>> {
    return this.http.post<News>(environment.newsCreate, n, { observe: 'response', params: { push } });
  }

  /** push: send the push once the post is live. 202 when the change was submitted for review. */
  update(n: News, push = false): Observable<HttpResponse<News>> {
    return this.http.put<News>(environment.newsUpdate + "/" + n.id, n, { observe: 'response', params: { push } });
  }

  deleteById(id: number): Observable<HttpResponse<News>> {
    return this.http.delete<News>(environment.newsDelete + "/" + id, { observe: 'response' });
  }

  searchTitle(query: string): Observable<HttpResponse<News[]>> {
    return this.http.get<News[]>(environment.searchNews + query, { observe: 'response' });
  }

  /** Submits one push for the given posts for review; it is named after the newest of them. */
  sendPush(ids: number[]): Observable<HttpResponse<ReviewSummary>> {
    return this.http.post<ReviewSummary>(environment.newsPush, { ids }, { observe: 'response' });
  }

  /** Submits sending the post as newsletter for review. */
  sendNewsletter(id: number): Observable<HttpResponse<ReviewSummary>> {
    return this.http.post<ReviewSummary>(environment.newsNewsletter + id, {}, { observe: 'response' });
  }

  getById(id: number): Observable<HttpResponse<News>> {
    return this.http.get<News>(environment.newsGet + "/" + id, { observe: 'response' });
  }

  /** Filtered, sorted and paged by the backend. As admin this includes private posts. */
  list(query: NewsListQuery): Observable<Page<News>> {
    const params = toHttpParams({
      category: query.category, app: query.app, visibility: query.visibility, q: query.q, sort: query.sort,
      page: query.page !== undefined ? query.page - 1 : undefined, size: query.size,
    });
    return this.http.get<News[]>(environment.newsGet, { observe: 'response', params }).pipe(map(toPage));
  }

  /** Categories in use with their post count. */
  categories(): Observable<Facet[]> {
    return this.http.get<Facet[]>(environment.newsCategories);
  }

  getAll(): Observable<HttpResponse<News[]>> {
    return this.http.get<News[]>(environment.newsGet, { observe: 'response' });
  }
}
