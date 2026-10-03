import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {News} from '../models/news';
import {Facet, Page, toHttpParams, toPage} from '../models/listing';

/** Filters for the news listing. Leave page and size out to get every match. */
export interface NewsListQuery {
  category?: string;
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

  create(n: News): Observable<HttpResponse<News>> {
    return this.http.post<News>(environment.newsCreate, n, { observe: 'response' });
  }

  update(n: News): Observable<HttpResponse<News>> {
    return this.http.put<News>(environment.newsUpdate + "/" + n.id, n, { observe: 'response' });
  }

  deleteById(id: number): Observable<HttpResponse<News>> {
    return this.http.delete<News>(environment.newsDelete + "/" + id, { observe: 'response' });
  }

  searchTitle(query: string): Observable<HttpResponse<News[]>> {
    return this.http.get<News[]>(environment.searchNews + query, { observe: 'response' });
  }

  /** Sends one push for the given posts, named after the newest of them. */
  sendPush(ids: number[]): Observable<HttpResponse<string>> {
    return this.http.post(environment.newsPush, { ids }, { observe: 'response', responseType: 'text' });
  }

  sendNewsletter(id: number): Observable<HttpResponse<string>> {
    return this.http.post(environment.newsNewsletter + id, {}, { observe: 'response', responseType: 'text' });
  }

  getById(id: number): Observable<HttpResponse<News>> {
    return this.http.get<News>(environment.newsGet + "/" + id, { observe: 'response' });
  }

  /** Filtered, sorted and paged by the backend. As admin this includes private posts. */
  list(query: NewsListQuery): Observable<Page<News>> {
    const params = toHttpParams({
      category: query.category, q: query.q, sort: query.sort,
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
