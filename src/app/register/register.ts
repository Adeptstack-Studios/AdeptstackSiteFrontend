import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthorizationService} from '../services/authorization';
import {LocalStorageService} from '../services/local-storage-service';
import {SignupRequest} from '../models/signup-request';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  authService: AuthorizationService;
  storage: LocalStorageService;
  request: SignupRequest = new SignupRequest();
  msg: string | undefined;

  constructor() {
    this.authService = inject(AuthorizationService);
    this.storage = inject(LocalStorageService);
  }

  signupForm: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  })

  onSubmit() {
    this.storage.remove("auth-key");
    const formValue = this.signupForm.value;

    if (this.signupForm.valid) {
      this.request.username = formValue.username;
      this.request.password = formValue.password;

      this.authService.register(this.request).subscribe({
        next: (response) => {
          this.msg = response.response;
        }, error: (error) => {
          console.log("error: " + error.message);
        }
      })
    } else {
      console.log("invalid form");
    }
  }
}
