import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, shareReplay} from 'rxjs';
import {environment} from '../../environments/environment';
import {quietRequest} from '../core/errors/http-errors';
import {Webhook, WebhookDelivery, WebhookRequest} from '../models/webhooks';

/** Webhooks, e.g. for Discord. Managing them is for owners; the editors only ask which ones a tick reaches. */
@Injectable({providedIn: 'root'})
export class WebhookService {
  private readonly http = inject(HttpClient);
  private choosable$?: Observable<string[]>;

  list(): Observable<Webhook[]> {
    return this.http.get<Webhook[]>(environment.webhooks);
  }

  create(request: WebhookRequest): Observable<Webhook> {
    return this.http.post<Webhook>(environment.webhooks, request);
  }

  update(id: number, request: WebhookRequest): Observable<Webhook> {
    return this.http.put<Webhook>(`${environment.webhooks}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.webhooks}/${id}`);
  }

  deliveries(id: number, limit = 20): Observable<WebhookDelivery[]> {
    return this.http.get<WebhookDelivery[]>(`${environment.webhooks}/${id}/deliveries`, {params: new HttpParams().set('limit', limit)});
  }

  test(id: number): Observable<WebhookDelivery> {
    return this.http.post<WebhookDelivery>(`${environment.webhooks}/${id}/test`, null);
  }

  /** The names of the webhooks “Post to webhooks” sends to; asked once per visit. */
  choosable(): Observable<string[]> {
    this.choosable$ ??= this.http.get<string[]>(`${environment.webhooks}/choosable`, {context: quietRequest()})
      .pipe(shareReplay(1));
    return this.choosable$;
  }

  /** after the owner changed the webhooks */
  forgetChoosable() {
    this.choosable$ = undefined;
  }
}
