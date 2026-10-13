import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {ActivityEntry, ActivityTarget, InviteInfo, Role, TeamMember} from '../models/team';

export interface ActivityPage {
  items: ActivityEntry[];
  total: number;
}

/** Team, roles and invites (owners only), and the activity log (everyone). */
@Injectable({providedIn: 'root'})
export class TeamService {
  private readonly http = inject(HttpClient);

  members(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(environment.teamMembers);
  }

  /** With a start password the person has to replace at the first sign-in. */
  addMember(username: string, password: string, role: Role): Observable<TeamMember> {
    return this.http.post<TeamMember>(environment.teamMembers, {username, password, role});
  }

  changeRole(id: number, role: Role): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${environment.teamMembers}/${id}/role`, {role});
  }

  resetPassword(id: number, password: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${environment.teamMembers}/${id}/password`, {password});
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.teamMembers}/${id}`);
  }

  invites(): Observable<InviteInfo[]> {
    return this.http.get<InviteInfo[]>(environment.teamInvites);
  }

  invite(username: string, role: Role): Observable<InviteInfo> {
    return this.http.post<InviteInfo>(environment.teamInvites, {username, role});
  }

  revokeInvite(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.teamInvites}/${id}`);
  }

  /** Newest first; page is 1-based like the pagination component. */
  activity(page: number, size: number, filter: { actor?: string; app?: number; targets?: ActivityTarget[] } = {}):
    Observable<ActivityPage> {
    let params = new HttpParams().set('page', page - 1).set('size', size);
    if (filter.actor) params = params.set('actor', filter.actor);
    if (filter.app != null) params = params.set('app', filter.app);
    for (const target of filter.targets ?? []) params = params.append('target', target);
    return this.http.get<ActivityEntry[]>(environment.activity, {params, observe: 'response'}).pipe(
      map((response: HttpResponse<ActivityEntry[]>) => ({
        items: response.body ?? [],
        total: Number(response.headers.get('X-Total-Count') ?? response.body?.length ?? 0),
      })));
  }
}
