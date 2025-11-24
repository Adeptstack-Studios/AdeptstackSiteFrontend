import { CanActivate, CanActivateChild, CanMatch, Router, UrlSegment, UrlTree } from '@angular/router';
import {inject, Injectable} from '@angular/core';
import {LocalStorageService} from '../services/local-storage-service';
import {AuthorizationService} from '../services/authorization';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanMatch {
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private auth = inject(AuthorizationService);

  canActivate(): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth();
  }

  canActivateChild(): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth();
  }

  canMatch(): Observable<boolean | UrlTree> | boolean | UrlTree {
    return this.checkAuth();
  }

  private checkAuth(): Observable<boolean | UrlTree> | boolean | UrlTree {
    const token = this.storage.get('auth-key');
    console.log('Auth Key:: ' + token);

    if (!token) {
      return this.router.createUrlTree(['/login']);
    }

    // Verify token with backend to prevent access with stale/invalid tokens
    return this.auth.verifyLogin().pipe(
      map(() => true),
      catchError(err => {
        console.log('Auth verification failed:', err?.message || err);
        this.storage.remove('auth-key');
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}
