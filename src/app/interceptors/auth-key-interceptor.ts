import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from "rxjs";
import {LocalStorageService} from '../services/local-storage-service';

@Injectable()
export class authKeyInterceptor implements HttpInterceptor {
  localStorage: LocalStorageService;

  constructor() {
    this.localStorage = inject(LocalStorageService);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler) {
      const token = this.localStorage.get("auth-key");

      if (token) {
        req = req.clone({
          url: req.url,
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }

      return next.handle(req);
    }
}
