import {Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {CdkMenu, CdkMenuGroup, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger} from '@angular/cdk/menu';
import {filter} from 'rxjs';
import {ChevronDown, FileText, Layers, LayoutGrid, LogOut, LucideAngularModule, Menu, Monitor, Moon, Sun} from 'lucide-angular';
import {AuthorizationService} from '../services/authorization';
import {LocalStorageService} from '../services/local-storage-service';
import {ThemeService} from '../core/theme/theme-service';
import {User} from '../models/user';
import {SessionTimer} from '../core/session/session-timer';

/** The console frame: sidebar, top bar and the page below it. */
@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule, CdkMenuTrigger, CdkMenu, CdkMenuGroup, CdkMenuItem, CdkMenuItemRadio, SessionTimer],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css'
})
export class AdminPanel {
  private readonly auth = inject(AuthorizationService);
  private readonly storage = inject(LocalStorageService);
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);

  protected readonly user = signal<User | undefined>(undefined);
  protected readonly navOpen = signal(false);
  protected readonly pageLabel = signal('');

  protected readonly nav = [
    {path: 'news', label: 'Blog', icon: FileText},
    {path: 'changelogs', label: 'Changelogs', icon: Layers},
    {path: 'apps', label: 'Apps', icon: LayoutGrid},
  ];
  protected readonly icons = {ChevronDown, LogOut, Menu, Monitor, Moon, Sun};

  constructor() {
    this.auth.me().subscribe(user => this.user.set(user));

    this.updatePageLabel();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      this.updatePageLabel();
      this.navOpen.set(false);
    });
  }

  protected initial(user: User) {
    return (user.username ?? '?').charAt(0).toUpperCase();
  }

  protected logout() {
    this.storage.remove('auth-key');
    this.user.set(undefined);
    this.router.navigateByUrl('/login');
  }

  private updatePageLabel() {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.pageLabel.set(route.data['label'] ?? '');
  }
}
