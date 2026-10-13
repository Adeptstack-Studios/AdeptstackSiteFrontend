import { CanActivate, CanActivateChild, CanMatch, Router, UrlSegment, UrlTree } from '@angular/router';
import {inject, Injectable} from '@angular/core';
import {LocalStorageService} from '../services/local-storage-service';
import {AuthorizationService} from '../services/authorization';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {CurrentUser} from '../core/auth/current-user';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanMatch {
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private auth = inject(AuthorizationService);
  private currentUser = inject(CurrentUser);

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

    if (!token) {
      return this.router.createUrlTree(['/login']);
    }

    // Verify token with backend to prevent access with stale/invalid tokens
    return this.auth.verifyLogin().pipe(
      switchMap(() => this.currentUser.ensure()),
      // an account with a start password chooses its own one before anything else
      map(user => user.mustChangePassword ? this.router.createUrlTree(['/welcome']) : true),
      // an expired or invalid session simply ends on the login page
      catchError(() => {
        this.storage.remove('auth-key');
        this.currentUser.clear();
        return of(this.router.createUrlTree(['/login']));
      })
    );
  }
}
