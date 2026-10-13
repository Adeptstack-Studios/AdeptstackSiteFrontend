import {computed, inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of, tap} from 'rxjs';
import {AuthorizationService} from '../../services/authorization';
import {User} from '../../models/user';
import {LocalStorageService} from '../../services/local-storage-service';

/** The signed-in account and what its role allows. Loaded once per sign-in, cleared on sign-out. */
@Injectable({providedIn: 'root'})
export class CurrentUser {
  private readonly auth = inject(AuthorizationService);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly role = computed(() => this.user()?.role ?? null);
  readonly isOwner = computed(() => this.role() === 'OWNER');
  /** viewers see everything but change nothing; the backend refuses it anyway */
  readonly canEdit = computed(() => this.role() === 'OWNER' || this.role() === 'EDITOR');

  /** The cached account, or the one the server reports. */
  ensure(): Observable<User> {
    const user = this.user();
    return user ? of(user) : this.reload();
  }

  reload(): Observable<User> {
    return this.auth.me().pipe(tap(user => this.user.set(user)));
  }

  clear() {
    this.user.set(null);
  }

  /** Forgets the token and the account and goes to the sign-in page. */
  signOut() {
    this.storage.remove('auth-key');
    this.clear();
    this.router.navigateByUrl('/login');
  }
}
