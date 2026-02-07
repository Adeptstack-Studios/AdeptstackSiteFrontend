import { Routes } from '@angular/router';
import {Login} from './login/login';
import {AuthGuard} from './guards/auth-guard';
import {Register} from './register/register';
import {AdminPanel} from './admin-panel/admin-panel';
import {AdminNews} from './admin-news/admin-news';
import {AdminChangelogs} from './admin-changelogs/admin-changelogs';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  // { path: 'register', component: Register, canMatch: [AuthGuard], canActivate: [AuthGuard] },
  {
    path: '',
    component: AdminPanel,
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'news' },
      { path: 'news', component: AdminNews, canMatch: [AuthGuard], canActivate: [AuthGuard] },
      { path: 'changelogs', component: AdminChangelogs, canMatch: [AuthGuard], canActivate: [AuthGuard] },
    ]
  },
];
