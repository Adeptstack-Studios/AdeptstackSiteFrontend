import { Routes } from '@angular/router';
import {Login} from './login/login';
import {AuthGuard} from './guards/auth-guard';
import {Register} from './register/register';
import {AdminPanel} from './admin-panel/admin-panel';

export const routes: Routes = [
  //{path: '', redirectTo: 'login', pathMatch: 'full'},
  {path: 'login', component: Login},
  {path: 'register', component: Register},
  {path: '', component: AdminPanel, canActivate: [AuthGuard]},
];
