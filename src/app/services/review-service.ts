import {inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {map, Observable, tap} from 'rxjs';
import {environment} from '../../environments/environment';
import {quietRequest} from '../core/errors/http-errors';
import {ContentFinding, ContentRule, ReviewCounts, ReviewDetail, ReviewKind, ReviewSummary} from '../models/review';

export type ReviewFilter = 'open' | 'changes' | 'done' | 'mine';

/** The review queue, the content check and its rules. Keeps the counts for the sidebar. */
@Injectable({providedIn: 'root'})
export class ReviewService {
  private readonly http = inject(HttpClient);

  /** waiting for review, and the signed-in user's changes that were sent back */
  readonly counts = signal<ReviewCounts | null>(null);

  refreshCounts() {
    this.http.get<ReviewCounts>(environment.reviews + '/counts', {context: quietRequest()})
      .subscribe({next: counts => this.counts.set(counts), error: () => this.counts.set(null)});
  }

  /** page is 1-based like the pagination component */
  list(filter: ReviewFilter, page: number, size: number): Observable<{ items: ReviewSummary[]; total: number }> {
    const params = new HttpParams().set('filter', filter).set('page', page - 1).set('size', size);
    return this.http.get<ReviewSummary[]>(environment.reviews, {params, observe: 'response'}).pipe(
      map((response: HttpResponse<ReviewSummary[]>) => ({
        items: response.body ?? [],
        total: Number(response.headers.get('X-Total-Count') ?? response.body?.length ?? 0),
      })));
  }

  detail(id: number): Observable<ReviewDetail> {
    return this.http.get<ReviewDetail>(`${environment.reviews}/${id}`);
  }

  /** The open submission of one release, post or app; null when there is none. */
  openFor(kind: ReviewKind, targetId: number): Observable<ReviewDetail | null> {
    return this.http.get<ReviewDetail>(`${environment.reviews}/open/${kind}/${targetId}`, {observe: 'response'})
      .pipe(map(response => response.status === 204 ? null : response.body));
  }

  /** Open submissions of one kind, for the badges in lists. */
  openOf(kind: ReviewKind): Observable<ReviewSummary[]> {
    return this.http.get<ReviewSummary[]>(`${environment.reviews}/open`, {params: {kind}, context: quietRequest()});
  }

  /** submittedAt of the version that was read: if the author submitted again since, the backend refuses (409) */
  approve(id: number, comment: string, submittedAt: string): Observable<ReviewSummary> {
    return this.http.post<ReviewSummary>(`${environment.reviews}/${id}/approve`, {comment, submittedAt})
      .pipe(tap(() => this.refreshCounts()));
  }

  requestChanges(id: number, comment: string): Observable<ReviewSummary> {
    return this.http.post<ReviewSummary>(`${environment.reviews}/${id}/request-changes`, {comment})
      .pipe(tap(() => this.refreshCounts()));
  }

  /** Approved store listing changes waiting for their release or moment. */
  planned(kind: ReviewKind, targetId: number): Observable<ReviewDetail[]> {
    return this.http.get<ReviewDetail[]>(`${environment.reviews}/planned/${kind}/${targetId}`);
  }

  /** Calls a planned change off; nothing goes live. */
  cancelPlan(id: number): Observable<ReviewSummary> {
    return this.http.post<ReviewSummary>(`${environment.reviews}/${id}/cancel-plan`, null);
  }

  withdraw(id: number): Observable<ReviewSummary> {
    return this.http.post<ReviewSummary>(`${environment.reviews}/${id}/withdraw`, null)
      .pipe(tap(() => this.refreshCounts()));
  }

  check(text: string): Observable<ContentFinding[]> {
    return this.http.post<ContentFinding[]>(environment.contentCheck, {text});
  }

  rules(): Observable<{ rules: ContentRule[]; builtIn: Record<string, number> }> {
    return this.http.get<{ rules: ContentRule[]; builtIn: Record<string, number> }>(environment.contentRules);
  }

  saveRule(term: string, level: ContentRule['level']): Observable<ContentRule> {
    return this.http.post<ContentRule>(environment.contentRules, {term, level});
  }

  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.contentRules}/${id}`);
  }
}
