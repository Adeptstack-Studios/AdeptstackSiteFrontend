import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {catchError, map, of} from 'rxjs';
import {CurrentUser} from './current-user';
import {LocalStorageService} from '../../services/local-storage-service';

/** Team & roles: owners only, everyone else lands on the overview. */
export const ownerGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(CurrentUser).ensure().pipe(
    map(user => user.role === 'OWNER' ? true : router.createUrlTree(['/'])),
    catchError(() => of(router.createUrlTree(['/login']))));
};

/** Pages outside the console frame that still need a session, like choosing the own password. */
export const signedInGuard: CanActivateFn = () => {
  return inject(LocalStorageService).get('auth-key') ? true : inject(Router).createUrlTree(['/login']);
};
