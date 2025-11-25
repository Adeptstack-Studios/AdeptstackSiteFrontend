import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Changelogs} from '../models/changelogs';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChangelogsService {
  http: HttpClient;

  constructor() {
    this.http = inject(HttpClient);
  }

  create(c: Changelogs): Observable<HttpResponse<Changelogs>> {
    return this.http.post<Changelogs>(environment.changelogs, c, { observe: 'response' });
  }

  update(c: Changelogs): Observable<HttpResponse<Changelogs>> {
    return this.http.put<Changelogs>(environment.changelogs + "/" + c.id, c, { observe: 'response' });
  }

  deleteById(id: number): Observable<HttpResponse<Changelogs>> {
    return this.http.delete<Changelogs>(environment.changelogs + "/" + id, { observe: 'response' });
  }

  search(query: string): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.searchChangelogs + query, { observe: 'response' });
  }

  getById(id: number): Observable<HttpResponse<Changelogs>> {
    return this.http.get<Changelogs>(environment.changelogs + "/" + id, { observe: 'response' });
  }

  getAll(): Observable<HttpResponse<Changelogs[]>> {
    return this.http.get<Changelogs[]>(environment.changelogs, { observe: 'response' });
  }
}
