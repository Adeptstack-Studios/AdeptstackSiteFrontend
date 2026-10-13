import {Component, inject, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthorizationService} from '../../services/authorization';
import {LocalStorageService} from '../../services/local-storage-service';
import {CurrentUser} from '../../core/auth/current-user';
import {ToastService} from '../../services/toast-service';
import {InviteInfo, PASSWORD_MAX, PASSWORD_MIN, ROLE_INFO} from '../../models/team';
import {matchingPasswords} from '../account/password-form';

/** Public page behind an invite link: pick a name and a password, then the console opens. */
@Component({
  selector: 'app-join-page',
  imports: [ReactiveFormsModule, RouterLink],
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

        @if (state() === 'loading') {
          <div class="c-skeleton" style="height: 160px"></div>
        } @else if (state() === 'invalid') {
          <div>
            <h1>This link does not work anymore</h1>
            <p class="lead">Invite links work once and for 7 days. Ask the person who invited you for a new one,
              and open it exactly as you got it.</p>
          </div>
          <p class="foot">Already in the team? <a routerLink="/login">Sign in</a></p>
        } @else if (invite(); as info) {
          <div>
            <h1>Join the Adeptstack team</h1>
            <p class="lead">
              {{ info.createdBy ? info.createdBy + ' invited you' : 'You are invited' }} as
              <strong>{{ roles[info.role].label.toLowerCase() }}</strong>: {{ roles[info.role].note.toLowerCase() }}
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="join()">
            <div class="field">
              <label for="join-username">Your username</label>
              <!-- the owner chose it; the field is there so password managers store it with the password -->
              <input id="join-username" type="text" [value]="info.username" autocomplete="username" readonly>
              <span class="hint">Chosen by {{ info.createdBy ?? 'the owner' }}. You sign in with it.</span>
            </div>
            <div formGroupName="next" class="pair">
              <div class="field">
                <label for="join-password">Password</label>
                <input id="join-password" type="password" formControlName="password" autocomplete="new-password">
              </div>
              <div class="field">
                <label for="join-repeat">Repeat it</label>
                <input id="join-repeat" type="password" formControlName="repeat" autocomplete="new-password">
              </div>
            </div>
            @if (form.controls.next.touched && form.controls.next.controls.password.errors) {
              <span class="error">Use {{ min }} to {{ max }} characters for the password.</span>
            } @else if (form.controls.next.controls.repeat.touched && form.controls.next.errors?.['mismatch']) {
              <span class="error">The two passwords are not the same.</span>
            }
            <button type="submit" class="btn" [disabled]="joining()">{{ joining() ? 'Joining…' : 'Join the team' }}</button>
          </form>
        }
      </div>
    </div>
  `,
  styleUrl: '../../shared/styles/auth-page.css',
  styles: `
    .wide {
      max-width: 480px;
    }

    .pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .hint {
      color: var(--muted);
      font-size: 13px;
    }

    input[readonly] {
      background: var(--panel-2);
      font-family: var(--font-mono);
    }

    @media (max-width: 480px) {
      .pair {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `
})
export class JoinPage {
  private readonly auth = inject(AuthorizationService);
  private readonly storage = inject(LocalStorageService);
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  /** after the # of the link: browsers never send that part to a server */
  private readonly token = inject(ActivatedRoute).snapshot.fragment ?? '';

  protected readonly roles = ROLE_INFO;
  protected readonly min = PASSWORD_MIN;
  protected readonly max = PASSWORD_MAX;
  protected readonly state = signal<'loading' | 'ready' | 'invalid'>('loading');
  protected readonly invite = signal<InviteInfo | null>(null);
  protected readonly joining = signal(false);

  protected readonly form = new FormGroup({
    next: new FormGroup({
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)]
      }),
      repeat: new FormControl('', {nonNullable: true, validators: Validators.required}),
    }, {validators: matchingPasswords}),
  });

  constructor() {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    this.auth.invite(this.token).subscribe({
      next: invite => {
        this.invite.set(invite);
        this.state.set('ready');
      },
      error: () => this.state.set('invalid'),
    });
  }

  protected join() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const {next} = this.form.getRawValue();
    this.joining.set(true);
    this.auth.join(this.token, next.password).subscribe({
      next: response => {
        this.storage.set('auth-key', response.token);
        this.currentUser.clear();
        this.toast.success('Welcome to the team!');
        this.router.navigateByUrl('/');
      },
      // the error toast says why, e.g. a link someone else used a moment earlier
      error: () => this.joining.set(false),
    });
  }
}
