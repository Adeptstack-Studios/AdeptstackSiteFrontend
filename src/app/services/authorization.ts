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

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(environment.login, request );
  }

  register(request: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(environment.register, request );
  }

  verifyLogin(): Observable<AdminPanelResponse> {
    return this.http.get<AdminPanelResponse>(environment.verifyLogin);
  }

  me(): Observable<User> {
    return this.http.get<User>(environment.me);
  }
}
