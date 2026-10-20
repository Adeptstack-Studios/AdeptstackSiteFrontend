import {Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {PasswordForm} from './password-form';
import {CurrentUser} from '../../core/auth/current-user';
import {ToastService} from '../../services/toast-service';
import {ROLE_INFO} from '../../models/team';

/** The own account: name, role and what it allows, and the password. */
@Component({
  selector: 'app-account-page',
  imports: [PasswordForm, RouterLink],
  template: `
    <div class="c-scroll">
      <div class="c-page narrow">
        <header class="c-page-head">
          <div>
            <h1>Account</h1>
            <p class="c-sub">Your sign-in and what your role allows</p>
          </div>
        </header>

        <section class="c-card" aria-labelledby="you-heading">
          <div class="c-card-head"><h2 id="you-heading">You</h2></div>
          @if (currentUser.user(); as user) {
            <dl class="facts">
              <dt>Username</dt>
              <dd class="mono">{{ user.username }}</dd>
              <dt>Role</dt>
              <dd>
                <span class="c-chip role">{{ role()?.label ?? 'none' }}</span>
                <span class="c-muted">{{ role()?.note }}</span>
              </dd>
            </dl>
            <p class="c-hint">
              @if (currentUser.isOwner()) {
                Roles are set under <a class="c-link" routerLink="/settings/team">Team &amp; roles</a>.
              } @else {
                An owner of the team can change your role.
              }
            </p>
          }
        </section>

        <section class="c-card" aria-labelledby="password-heading">
          <div class="c-card-head">
            <h2 id="password-heading">Password</h2>
            <p class="c-sub">Changing it signs you out everywhere else.</p>
          </div>
          <app-password-form (changed)="toast.success('Password changed. Other devices are signed out.')"></app-password-form>
        </section>
      </div>
    </div>
  `,
  styles: `
    /* left-aligned like every page, just not as wide */
    .narrow > * {
      max-width: 760px;
    }

    .facts {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 10px 24px;
      margin: 0 0 14px;
    }

    .facts dt {
      color: var(--muted);
      font-size: 13px;
    }

    .facts dd {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .role {
      text-transform: capitalize;
    }

    .c-hint {
      margin: 0;
    }
  `
})
export class AccountPage {
  protected readonly currentUser = inject(CurrentUser);
  protected readonly toast = inject(ToastService);
  protected readonly role = computed(() => {
    const role = this.currentUser.role();
    return role ? ROLE_INFO[role] : null;
  });
}
