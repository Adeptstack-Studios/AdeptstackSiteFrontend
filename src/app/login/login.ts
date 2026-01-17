import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {LoginRequest} from '../models/login-request';
import {LocalStorageService} from '../services/local-storage-service';
import {Router, RouterLink} from '@angular/router';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NgOptimizedImage],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  request: LoginRequest = new LoginRequest();
  authService: AuthorizationService;
  localStorageService: LocalStorageService;
  router: Router;

  constructor() {
    this.authService = inject(AuthorizationService);
    this.localStorageService = inject(LocalStorageService);
    this.router = inject(Router);
  }

  userForm: FormGroup = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  login() {
    this.localStorageService.remove("auth-key");
    const formValue = this.userForm.value;

    if (formValue.username == "" || formValue.password == "") {
      return;
    }

    this.request.username = formValue.username;
    this.request.password = formValue.password;

    this.authService.login(this.request).subscribe({
      next: (response) => {
        console.log("received: " + response.token);
        this.localStorageService.set("auth-key", response.token);

        this.authService.verifyLogin().subscribe({
          next: (response) => {
            console.log("received: " + response.response);
            this.router.navigateByUrl("/news");
          }, error: (error) => {
            console.log("error: " + error.message);
            this.localStorageService.remove("auth-key");
          }
        })

      }, error: (error) => {
        console.log("error: " + error);
        this.localStorageService.remove("auth-key");
      }
    });
  }
}
