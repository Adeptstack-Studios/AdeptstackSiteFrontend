import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {LoginRequest} from '../models/login-request';
import {Observable} from 'rxjs';
import {LoginResponse} from '../models/login-response';
import {AdminPanelResponse} from '../models/admin-panel-response';
import {SignupRequest} from '../models/signup-request';
import {SignupResponse} from '../models/signup-response';
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

  register(request: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(environment.register, request );
  }

  /** Quiet: the route guard sends an expired session to the login page without a toast. */
  verifyLogin(): Observable<AdminPanelResponse> {
    return this.http.get<AdminPanelResponse>(environment.verifyLogin, { context: quietRequest() });
  }

  me(): Observable<User> {
    return this.http.get<User>(environment.me, { context: quietRequest() });
  }
}
