import { Routes } from '@angular/router';
import {Login} from './login/login';
import {AuthGuard} from './guards/auth-guard';

export const routes: Routes = [
  //{path: '', redirectTo: 'login', pathMatch: 'full'},
  {path: 'login', component: Login},
  {path: '', component: Login, canActivate: [AuthGuard]},
];
