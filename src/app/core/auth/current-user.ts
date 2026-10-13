import {computed, inject, Injectable, signal} from '@angular/core';
import {Observable, of, tap} from 'rxjs';
import {AuthorizationService} from '../../services/authorization';
import {User} from '../../models/user';

/** The signed-in account and what its role allows. Loaded once per sign-in, cleared on sign-out. */
@Injectable({providedIn: 'root'})
export class CurrentUser {
  private readonly auth = inject(AuthorizationService);

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
}
