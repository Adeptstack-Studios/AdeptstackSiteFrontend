import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {PasswordForm} from './password-form';
import {CurrentUser} from '../../core/auth/current-user';
import {LocalStorageService} from '../../services/local-storage-service';
import {ToastService} from '../../services/toast-service';

/** After signing in with a start password: the own password comes first, then the console. */
@Component({
  selector: 'app-welcome-page',
  imports: [PasswordForm],
  template: `
    <div class="auth-page">
      <div class="auth-card wide">
        <div class="brand">
          <span class="brand-mark"><img src="img/adeptstack_white.png" alt="" width="20" height="20"></span>
          <span class="brand-text">
            <span class="brand-name">adeptstack</span>
            <span class="brand-sub">console</span>
          </span>
        </div>

        <div>
          <h1>Choose your own password</h1>
          <p class="lead">
            You signed in with a start password{{ name() ? ', ' + name() : '' }}. Replace it once and the console opens.
          </p>
        </div>

        <app-password-form currentLabel="Start password" submitLabel="Save and continue"
                           (changed)="done()"></app-password-form>

        <p class="foot"><button type="button" class="link-btn" (click)="signOut()">Sign out</button></p>
      </div>
    </div>
  `,
  styleUrl: '../../shared/styles/auth-page.css',
  styles: `
    .wide {
      max-width: 480px;
    }

    .link-btn {
      border: none;
      background: none;
      padding: 0;
      color: var(--muted);
      font: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
  `
})
export class WelcomePage {
  private readonly router = inject(Router);
  private readonly storage = inject(LocalStorageService);
  private readonly toast = inject(ToastService);
  private readonly currentUser = inject(CurrentUser);

  protected readonly name = () => this.currentUser.user()?.username ?? '';

  constructor() {
    this.currentUser.ensure().subscribe({
      // someone who has nothing to change here goes straight on
      next: user => { if (!user.mustChangePassword) this.router.navigateByUrl('/'); },
      error: () => this.signOut(),
    });
  }

  protected done() {
    this.toast.success('Password saved. Welcome!');
    this.router.navigateByUrl('/');
  }

  protected signOut() {
    this.storage.remove('auth-key');
    this.currentUser.clear();
    this.router.navigateByUrl('/login');
  }
}
