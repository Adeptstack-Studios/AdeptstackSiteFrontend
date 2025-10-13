import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {LoginRequest} from '../models/login-request';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  request: LoginRequest = new LoginRequest();
  authService: AuthorizationService;

  constructor() {
    this.authService = inject(AuthorizationService);
  }

  userForm: FormGroup = new FormGroup({
    username: new FormControl(''),
    password: new FormControl('')
  });

  login() {
    const formValue = this.userForm.value;

    if (formValue.username == "" || formValue.password == "") {
      alert('Please enter both username and password');
      return;
    }

    this.request.username = formValue.username;
    this.request.password = formValue.password;

    this.authService.login(this.request).subscribe({
      next: (response) => {
        console.log("received: " + response);
      }, error: (error) => {
        console.log("error: " + error);
      }
    });
  }
}
