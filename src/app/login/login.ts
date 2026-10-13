import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {LoginRequest} from '../models/login-request';
import {LocalStorageService} from '../services/local-storage-service';
import {Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {ToastService} from '../services/toast-service';
import {errorMessage} from '../core/errors/http-errors';
import {CurrentUser} from '../core/auth/current-user';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: '../shared/styles/auth-page.css'
})
export class Login {
  private readonly authService = inject(AuthorizationService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly currentUser = inject(CurrentUser);

  request: LoginRequest = new LoginRequest();
  signingIn = false;

  userForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  login() {
    if (!this.userForm.valid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.localStorageService.remove("auth-key");
    const formValue = this.userForm.value;
    this.request.username = formValue.username;
    this.request.password = formValue.password;
    this.signingIn = true;

    this.authService.login(this.request).subscribe({
      next: (response) => {
        this.localStorageService.set("auth-key", response.token);
        this.currentUser.clear();
        // a start password from an owner is replaced before anything else
        if (response.mustChangePassword) {
          this.router.navigateByUrl("/welcome");
          return;
        }

        this.authService.verifyLogin().subscribe({
          next: () => {
            this.router.navigateByUrl("/");
          }, error: (error: HttpErrorResponse) => {
            this.localStorageService.remove("auth-key");
            this.signingIn = false;
            this.toast.error(errorMessage(error));
          }
        })

      }, error: (error: HttpErrorResponse) => {
        this.localStorageService.remove("auth-key");
        this.signingIn = false;
        // the server answers wrong credentials with 401/403; anything else is a real problem
        this.toast.error(error.status === 401 || error.status === 403
          ? 'Wrong username or password.'
          : errorMessage(error));
      }
    });
  }
}
