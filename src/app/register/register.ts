import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthorizationService} from '../services/authorization';
import {SignupRequest} from '../models/signup-request';
import {ToastService} from '../services/toast-service';

/** Creates another admin account. Only reachable while signed in. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../shared/styles/auth-page.css'
})
export class Register {
  private readonly authService = inject(AuthorizationService);
  private readonly toast = inject(ToastService);
  request: SignupRequest = new SignupRequest();
  msg: string | undefined;

  signupForm: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  })

  onSubmit() {
    if (!this.signupForm.valid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    // the request needs the current session: registering is only allowed for signed-in admins
    const formValue = this.signupForm.value;
    this.request.username = formValue.username;
    this.request.password = formValue.password;

    this.authService.register(this.request).subscribe(response => {
      this.msg = response.response;
      this.toast.success('Account created.');
      this.signupForm.reset();
    });
  }
}
