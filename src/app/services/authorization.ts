import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {LoginRequest} from '../models/login-request';
import {Observable} from 'rxjs';
import {LoginResponse} from '../models/login-response';
import {AdminPanelResponse} from '../models/admin-panel-response';
import {SignupRequest} from '../models/signup-request';
import {SignupResponse} from '../models/signup-response';
import {LocalStorageService} from './local-storage-service';

const API_URL = 'http://localhost:8080/api/auth/login';
const API_URL1 = 'http://localhost:8080/api/auth/panel';
const API_URL2 = 'http://localhost:8080/api/auth/register';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_URL, request );
  }

  register(request: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(API_URL2, request );
  }

  adminPanel(): Observable<AdminPanelResponse> {
    return this.http.get<AdminPanelResponse>(API_URL1);
  }
}
