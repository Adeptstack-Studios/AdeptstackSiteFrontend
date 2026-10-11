import { Routes } from '@angular/router';
import {Login} from './login/login';
import {AuthGuard} from './guards/auth-guard';

// Only the sign-in page ships with the first load; the console itself loads after signing in.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, title: 'Sign in · Adeptstack Console' },
  {
    path: 'register',
    loadComponent: () => import('./register/register').then(m => m.Register),
    canMatch: [AuthGuard], canActivate: [AuthGuard],
    title: 'Register · Adeptstack Console'
  },
  {
    path: '',
    loadComponent: () => import('./admin-panel/admin-panel').then(m => m.AdminPanel),
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'news' },
      // label: shown in the breadcrumb of the console frame
      {
        path: 'news',
        loadComponent: () => import('./admin-news/admin-news').then(m => m.AdminNews),
        canMatch: [AuthGuard], canActivate: [AuthGuard],
        title: 'Blog · Adeptstack Console', data: { label: 'Blog' }
      },
      {
        path: 'changelogs',
        loadComponent: () => import('./admin-changelogs/admin-changelogs').then(m => m.AdminChangelogs),
        canMatch: [AuthGuard], canActivate: [AuthGuard],
        title: 'Changelogs · Adeptstack Console', data: { label: 'Changelogs' }
      },
      {
        path: 'apps',
        loadComponent: () => import('./admin-apps/admin-apps').then(m => m.AdminApps),
        canMatch: [AuthGuard], canActivate: [AuthGuard],
        title: 'Apps · Adeptstack Console', data: { label: 'Apps' }
      },
    ]
  },
];
