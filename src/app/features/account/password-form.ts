import {Component, inject, input, output, signal} from '@angular/core';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {switchMap} from 'rxjs';
import {AuthorizationService} from '../../services/authorization';
import {LocalStorageService} from '../../services/local-storage-service';
import {CurrentUser} from '../../core/auth/current-user';
import {PASSWORD_MAX, PASSWORD_MIN} from '../../models/team';

/** The repeated password has to match the new one. */
export function matchingPasswords(group: AbstractControl): ValidationErrors | null {
  const value = group.value as { password?: string; repeat?: string };
  return value.repeat && value.password !== value.repeat ? {mismatch: true} : null;
}

/**
 * Current password, new one twice. On success the fresh token replaces the old one (the server
 * ends every other session) and the signed-in account is reloaded. Used on /welcome and /account.
 */
@Component({
  selector: 'app-password-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="password-form">
      <div>
        <label class="c-label" for="pw-current">{{ currentLabel() }}</label>
        <input id="pw-current" class="c-input" type="password" formControlName="current" autocomplete="current-password">
      </div>
      <div formGroupName="next" class="pair">
        <div>
          <label class="c-label" for="pw-new">New password</label>
          <input id="pw-new" class="c-input" type="password" formControlName="password" autocomplete="new-password"
                 aria-describedby="pw-rule">
        </div>
        <div>
          <label class="c-label" for="pw-repeat">Repeat it</label>
          <input id="pw-repeat" class="c-input" type="password" formControlName="repeat" autocomplete="new-password">
        </div>
      </div>
      @if (form.controls.next.touched && form.controls.next.controls.password.errors) {
        <p class="c-error">Use {{ min }} to {{ max }} characters.</p>
      } @else if (form.controls.next.controls.repeat.touched && form.controls.next.errors?.['mismatch']) {
        <p class="c-error">The two new passwords are not the same.</p>
      } @else {
        <p class="c-hint" id="pw-rule">At least {{ min }} characters. A few unrelated words are easy to remember and hard to guess.</p>
      }
      <div>
        <button type="submit" class="c-btn c-btn-primary" [disabled]="saving()">
          {{ saving() ? 'Saving…' : submitLabel() }}
        </button>
      </div>
    </form>
  `,
  styles: `
    .password-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .pair {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .password-form p {
      margin: -4px 0 0;
    }

    @media (max-width: 560px) {
      .pair {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `
})
export class PasswordForm {
  private readonly auth = inject(AuthorizationService);
  private readonly storage = inject(LocalStorageService);
  private readonly currentUser = inject(CurrentUser);

  readonly currentLabel = input('Current password');
  readonly submitLabel = input('Change password');
  readonly changed = output<void>();

  protected readonly min = PASSWORD_MIN;
  protected readonly max = PASSWORD_MAX;
  protected readonly saving = signal(false);

  protected readonly form = new FormGroup({
    current: new FormControl('', {nonNullable: true, validators: Validators.required}),
    next: new FormGroup({
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(PASSWORD_MIN), Validators.maxLength(PASSWORD_MAX)]
      }),
      repeat: new FormControl('', {nonNullable: true, validators: Validators.required}),
    }, {validators: matchingPasswords}),
  });

  protected save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const {current, next} = this.form.getRawValue();
    this.saving.set(true);
    this.auth.changePassword(current, next.password).pipe(
      switchMap(response => {
        this.storage.set('auth-key', response.token);
        return this.currentUser.reload();
      })
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.changed.emit();
      },
      // the error toast names the reason, e.g. a wrong current password
      error: () => this.saving.set(false),
    });
  }
}
