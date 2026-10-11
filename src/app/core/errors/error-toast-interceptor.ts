import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, Observable, throwError} from 'rxjs';
import {ToastService} from '../../services/toast-service';
import {LocalStorageService} from '../../services/local-storage-service';
import {errorMessage, SKIP_ERROR_TOAST} from './http-errors';

/**
 * Every failed request ends in one toast, so no page has to remember to report errors.
 * Callers still get the error and can roll back optimistic changes.
 */
@Injectable()
export class ErrorToastInterceptor implements HttpInterceptor {
  private readonly toast = inject(ToastService);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && !request.context.get(SKIP_ERROR_TOAST)) {
          this.toast.error(errorMessage(error));

          if (error.status === 401) {
            this.storage.remove('auth-key');
            this.router.navigateByUrl('/login');
          }
        }
        return throwError(() => error);
      })
    );
  }
}
