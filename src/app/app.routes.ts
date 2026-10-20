import { Routes } from '@angular/router';
import {Login} from './login/login';
import {AuthGuard} from './guards/auth-guard';
import {unsavedChangesGuard} from './core/unsaved/unsaved-changes';
import {ownerGuard, signedInGuard} from './core/auth/guards';

const TITLE = ' · Adeptstack Console';

// Only the sign-in page ships with the first load; the console itself loads after signing in.
// data.label names a route in the breadcrumb; data.isApp shows the open app's name there.
export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in' + TITLE },
  {
    // the token follows after #, so it never reaches a server log
    path: 'join',
    loadComponent: () => import('./features/team/join-page').then(m => m.JoinPage),
    title: 'Join the team' + TITLE
  },
  {
    path: 'welcome',
    loadComponent: () => import('./features/account/welcome-page').then(m => m.WelcomePage),
    canActivate: [signedInGuard],
    title: 'Choose your password' + TITLE
  },
  {
    path: '',
    loadComponent: () => import('./admin-panel/admin-panel').then(m => m.AdminPanel),
    canMatch: [AuthGuard],
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: '', pathMatch: 'full',
        loadComponent: () => import('./features/overview/overview').then(m => m.Overview),
        title: 'Overview' + TITLE, data: { label: 'Overview' }
      },
      {
        path: 'apps',
        data: { label: 'Apps' },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/apps/app-list/app-list').then(m => m.AppList),
            title: 'All apps' + TITLE
          },
          {
            path: 'new',
            loadComponent: () => import('./features/apps/app-editor/app-editor').then(m => m.AppEditor),
            canDeactivate: [unsavedChangesGuard],
            title: 'Create app' + TITLE, data: { label: 'Create app' }
          },
          {
            path: ':slug',
            loadComponent: () => import('./features/apps/app-scope').then(m => m.AppScope),
            data: { isApp: true },
            children: [
              {
                path: '',
                loadComponent: () => import('./features/apps/app-dashboard/app-dashboard').then(m => m.AppDashboard),
                title: 'Dashboard' + TITLE, data: { label: 'Dashboard' }
              },
              {
                path: 'releases',
                data: { label: 'Releases' },
                children: [
                  {
                    path: '',
                    loadComponent: () => import('./features/releases/release-list/release-list').then(m => m.ReleaseList),
                    title: 'Releases' + TITLE
                  },
                  {
                    path: 'new',
                    loadComponent: () => import('./features/releases/release-editor/release-editor').then(m => m.ReleaseEditor),
                    canDeactivate: [unsavedChangesGuard],
                    title: 'New release' + TITLE, data: { label: 'New release' }
                  },
                  {
                    path: ':id',
                    loadComponent: () => import('./features/releases/release-editor/release-editor').then(m => m.ReleaseEditor),
                    canDeactivate: [unsavedChangesGuard],
                    title: 'Edit release' + TITLE, data: { label: 'Edit release' }
                  },
                ]
              },
              {
                path: 'listing',
                loadComponent: () => import('./features/apps/app-editor/app-editor').then(m => m.AppEditor),
                canDeactivate: [unsavedChangesGuard],
                title: 'Store listing' + TITLE, data: { label: 'Store listing' }
              },
              {
                path: 'stats',
                loadComponent: () => import('./features/stats/app-stats-page').then(m => m.AppStatsPage),
                title: 'Statistics' + TITLE, data: { label: 'Statistics' }
              },
              {
                path: 'notifications',
                loadComponent: () => import('./features/notifications/notifications-page').then(m => m.NotificationsPage),
                title: 'Notifications' + TITLE, data: { label: 'Notifications' }
              },
              {
                path: 'activity',
                loadComponent: () => import('./features/activity/activity-page').then(m => m.ActivityPage),
                title: 'Activity' + TITLE, data: { label: 'Activity' }
              },
            ]
          },
        ]
      },
      {
        path: 'blog',
        data: { label: 'Blog' },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/blog/post-list/post-list').then(m => m.PostList),
            title: 'Blog' + TITLE
          },
          {
            path: 'new',
            loadComponent: () => import('./features/blog/post-editor/post-editor').then(m => m.PostEditor),
            canDeactivate: [unsavedChangesGuard],
            title: 'New post' + TITLE, data: { label: 'New post' }
          },
          {
            path: ':id',
            loadComponent: () => import('./features/blog/post-editor/post-editor').then(m => m.PostEditor),
            canDeactivate: [unsavedChangesGuard],
            title: 'Edit post' + TITLE, data: { label: 'Edit post' }
          },
        ]
      },
      {
        path: 'stats',
        loadComponent: () => import('./features/stats/stats-page').then(m => m.StatsPage),
        title: 'Statistics' + TITLE, data: { label: 'Statistics' }
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications-page').then(m => m.NotificationsPage),
        title: 'Notifications' + TITLE, data: { label: 'Notifications' }
      },
      {
        path: 'newsletter',
        loadComponent: () => import('./features/newsletter/newsletter-page').then(m => m.NewsletterPage),
        title: 'Newsletter' + TITLE, data: { label: 'Newsletter' }
      },
      {
        path: 'files',
        loadComponent: () => import('./features/files/files-page').then(m => m.FilesPage),
        title: 'Files' + TITLE, data: { label: 'Files' }
      },
      {
        path: 'activity',
        loadComponent: () => import('./features/activity/activity-page').then(m => m.ActivityPage),
        title: 'Activity' + TITLE, data: { label: 'Activity log' }
      },
      {
        path: 'roadmap',
        loadComponent: () => import('./features/roadmap/roadmap-page').then(m => m.RoadmapPage),
        title: 'Roadmap' + TITLE, data: { label: 'Roadmap' }
      },
      {
        path: 'reviews',
        data: { label: 'Reviews' },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/reviews/review-list-page').then(m => m.ReviewListPage),
            title: 'Reviews' + TITLE
          },
          {
            path: ':id',
            loadComponent: () => import('./features/reviews/review-page').then(m => m.ReviewPage),
            title: 'Review' + TITLE, data: { label: 'Review' }
          },
        ]
      },
      {
        path: 'content-check',
        loadComponent: () => import('./features/reviews/content-rules-page').then(m => m.ContentRulesPage),
        canActivate: [ownerGuard],
        title: 'Content check' + TITLE, data: { label: 'Content check' }
      },
      {
        path: 'webhooks',
        loadComponent: () => import('./features/webhooks/webhooks-page').then(m => m.WebhooksPage),
        canActivate: [ownerGuard],
        title: 'Webhooks' + TITLE, data: { label: 'Webhooks' }
      },
      {
        path: 'team',
        loadComponent: () => import('./features/team/team-page').then(m => m.TeamPage),
        canActivate: [ownerGuard],
        title: 'Team' + TITLE, data: { label: 'Team & roles' }
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account-page').then(m => m.AccountPage),
        title: 'Account' + TITLE, data: { label: 'Account' }
      },
      // older addresses: the blog moved, releases live with their app now
      { path: 'news', redirectTo: 'blog' },
      { path: 'changelogs', redirectTo: 'apps' },
    ]
  },
];
