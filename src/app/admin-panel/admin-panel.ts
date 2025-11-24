import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';
import {User} from '../models/user';
import {CommonModule} from '@angular/common';
import {LocalStorageService} from '../services/local-storage-service';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-admin-panel',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanel {
  auth: AuthorizationService;
  storage: LocalStorageService;
  router: Router;
  currentUser?: User;
  isMenuOpen = false;

  constructor() {
    this.auth = inject(AuthorizationService);
    this.storage = inject(LocalStorageService);
    this.router = inject(Router);

    this.auth.me().subscribe({
      next: (response) => {
        console.log("received: " + response.id);
        console.log("received: " + response.username);
        console.log("received: " + response.role);

        this.currentUser = response;
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    })
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout() {
    this.storage.remove("auth-key");
    this.currentUser = undefined;
    this.isMenuOpen = false;
    this.router.navigateByUrl('/login');
  }
}
