import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpContext, HttpResponse} from '@angular/common/http';
import {App} from '../models/app';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {AppResponse} from '../models/app-response';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }

  create(n: App): Observable<HttpResponse<AppResponse>> {
    return this.http.post<AppResponse>(environment.appsCreate, n, { observe: 'response' });
  }

  update(n: App): Observable<HttpResponse<AppResponse>> {
    return this.http.put<AppResponse>(environment.appsUpdate + "/" + n.id, n, { observe: 'response' });
  }

  deleteById(id: number): Observable<HttpResponse<AppResponse>> {
    return this.http.delete<AppResponse>(environment.appsDelete + "/" + id, { observe: 'response' });
  }

  searchName(query: string): Observable<HttpResponse<AppResponse[]>> {
    return this.http.get<AppResponse[]>(environment.searchApps + query, { observe: 'response' });
  }

  getById(id: number, context?: HttpContext): Observable<HttpResponse<AppResponse>> {
    return this.http.get<AppResponse>(environment.appsGet + "/" + id, { observe: 'response', context });
  }

  getAll(): Observable<HttpResponse<AppResponse[]>> {
    return this.http.get<AppResponse[]>(environment.appsGet, { observe: 'response' });
  }
}
