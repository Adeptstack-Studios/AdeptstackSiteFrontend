import {Component, inject} from '@angular/core';
import {AuthorizationService} from '../services/authorization';

@Component({
  selector: 'app-admin-panel',
  imports: [],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanel {
  auth: AuthorizationService

  constructor() {
    this.auth = inject(AuthorizationService)

    this.auth.me().subscribe({
      next: (response) => {
        console.log("received: " + response.id);
        console.log("received: " + response.username);
        console.log("received: " + response.role);
      }, error: (error) => {
        console.log("error: " + error.message);
      }
    })
  }


}
