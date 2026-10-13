import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {LoginRequest} from '../models/login-request';
import {Observable} from 'rxjs';
import {LoginResponse} from '../models/login-response';
import {AdminPanelResponse} from '../models/admin-panel-response';
import {InviteInfo} from '../models/team';
import {LocalStorageService} from './local-storage-service';
import {User} from '../models/user';
import {environment} from '../../environments/environment';
import {quietRequest} from '../core/errors/http-errors';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  /** Quiet: the login page explains a failed sign-in itself. */
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(environment.login, request, { context: quietRequest() });
  }

  /** Quiet: the route guard sends an expired session to the login page without a toast. */
  verifyLogin(): Observable<AdminPanelResponse> {
    return this.http.get<AdminPanelResponse>(environment.verifyLogin, { context: quietRequest() });
  }

  /** Trades the current, still valid token for one with a fresh lifetime. */
  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(environment.refresh, null);
  }

  me(): Observable<User> {
    return this.http.get<User>(environment.me, { context: quietRequest() });
  }

  /** The own password; other sessions end, this one goes on with the token in the answer. */
  changePassword(currentPassword: string, newPassword: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(environment.password, {currentPassword, newPassword});
  }

  /** Quiet: the join page explains a used or expired link itself. The token goes in the body, never in a URL. */
  invite(token: string): Observable<InviteInfo> {
    return this.http.post<InviteInfo>(environment.invite + 'check', {token}, { context: quietRequest() });
  }

  join(token: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(environment.invite + 'join', {token, password});
  }
}
