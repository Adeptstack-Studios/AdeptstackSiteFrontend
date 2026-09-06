import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {News} from '../models/news';

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

  getAll(): Observable<HttpResponse<News[]>> {
    return this.http.get<News[]>(environment.newsGet, { observe: 'response' });
  }
}
