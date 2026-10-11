import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, tap} from 'rxjs';
import {LocalStorageService} from '../../services/local-storage-service';
import {AuthorizationService} from '../../services/authorization';
import {ToastService} from '../../services/toast-service';
import {LoginResponse} from '../../models/login-response';

const TOKEN_KEY = 'auth-key';

/** From here on the countdown asks for attention. */
export const SESSION_WARN_SECONDS = 5 * 60;
/** From here on it is urgent. */
export const SESSION_URGENT_SECONDS = 60;

/**
 * Knows when the sign-in token runs out and counts down to it, so nobody types a long post
 * into a session that is already over. Ending the session sends you to the login page.
 */
@Injectable({providedIn: 'root'})
export class SessionService {
  private readonly storage = inject(LocalStorageService);
  private readonly auth = inject(AuthorizationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private readonly now = signal(Date.now());
  /** Read again on every tick: another tab may have extended or ended the session. */
  private readonly expiresAt = signal<number | null>(null);
  private timer?: ReturnType<typeof setInterval>;

  /** Whole seconds left, or null without a readable token. */
  readonly secondsLeft = computed(() => {
    const expiresAt = this.expiresAt();
    return expiresAt === null ? null : Math.max(0, Math.ceil((expiresAt - this.now()) / 1000));
  });
  readonly extending = signal(false);

  /** Starts the countdown for as long as the caller lives. */
  watch(destroyRef: DestroyRef) {
    this.tick();
    this.timer ??= setInterval(() => this.tick(), 1000);
    destroyRef.onDestroy(() => {
      clearInterval(this.timer);
      this.timer = undefined;
    });
  }

  extend(): Observable<LoginResponse> {
    this.extending.set(true);
    return this.auth.refresh().pipe(tap({
      next: response => {
        if (response.token) {
          this.storage.set(TOKEN_KEY, response.token);
        }
        this.extending.set(false);
        this.tick();
      },
      error: () => this.extending.set(false),
    }));
  }

  private tick() {
    this.now.set(Date.now());
    this.expiresAt.set(expiryOf(this.storage.get(TOKEN_KEY)));

    if (this.secondsLeft() === 0) {
      this.end();
    }
  }

  private end() {
    clearInterval(this.timer);
    this.timer = undefined;
    this.storage.remove(TOKEN_KEY);
    this.toast.info('Your session has expired. Please sign in again.');
    this.router.navigateByUrl('/login');
  }
}

/** The `exp` claim of a JWT in milliseconds. Only for display: the backend checks the signature. */
function expiryOf(token: string | null): number | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = JSON.parse(json).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}
