import { CanActivate, Router,} from '@angular/router';
import {inject, Injectable} from '@angular/core';
import {LocalStorageService} from '../services/local-storage-service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  router: Router;
  authService: LocalStorageService;

  constructor() {
    this.router = inject(Router);
    this.authService = inject(LocalStorageService);
  }

  canActivate(): boolean {
    return this.checkAuth();
  }

  private checkAuth(): boolean {
    console.log("Auth Key:: " + this.authService.get("auth-key"));

    if (this.authService.get("auth-key")) {
      return true;
    } else {
      this.router.navigateByUrl("/login");
      return false;
    }
  }
}
