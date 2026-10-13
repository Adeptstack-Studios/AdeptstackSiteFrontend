import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {CdkMenu, CdkMenuGroup, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger} from '@angular/cdk/menu';
import {filter} from 'rxjs';
import {
  ArrowUpRight, Bell, CalendarClock, ChartLine, ChevronDown, ClipboardCheck, ShieldCheck, ChevronLeft, ChevronsUpDown, Eye, FileText, History, House, Layers,
  LayoutDashboard, LayoutGrid, LogOut, LucideAngularModule, Mail, Menu, Monitor, Moon, Store, Sun, UserRound, Users
} from 'lucide-angular';
import {ThemeService} from '../core/theme/theme-service';
import {AppContext} from '../core/app-context/app-context';
import {User} from '../models/user';
import {CurrentUser} from '../core/auth/current-user';
import {checklistDone} from '../models/console';
import {SessionTimer} from '../core/session/session-timer';
import {AppTile} from '../shared/ui/app-tile';
import {PlatformsPipe} from '../shared/ui/platforms';
import {ReviewService} from '../services/review-service';
import {PaletteTrigger} from '../core/palette/palette-trigger';
import {PaletteService} from '../core/palette/palette-service';

/** One step of the route chain that shows up in the breadcrumb. */
interface RouteStep {
  url: string;
  label?: string;
  /** the :slug route, labelled with the app's name once it is loaded */
  isApp?: boolean;
}

/** The console frame: sidebar (global, or for one app), top bar and the page below it. */
@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideAngularModule, CdkMenuTrigger, CdkMenu, CdkMenuGroup,
    CdkMenuItem, CdkMenuItemRadio, SessionTimer, AppTile, PlatformsPipe, PaletteTrigger],
  templateUrl: './admin-panel.html',
  host: {'(document:keydown)': 'shortcut($event)'},
  styleUrls: ['./admin-panel.css', './app-nav.css']
})
export class AdminPanel {
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  protected readonly context = inject(AppContext);
  protected readonly currentUser = inject(CurrentUser);
  private readonly reviews = inject(ReviewService);
  private readonly palette = inject(PaletteService);

  protected readonly user = this.currentUser.user;
  protected readonly navOpen = signal(false);
  private readonly steps = signal<RouteStep[]>([]);

  protected readonly nav = [
    {path: '/', label: 'Overview', icon: House, exact: true},
    {path: '/apps', label: 'All apps', icon: LayoutGrid, exact: true},
    {path: '/blog', label: 'Blog', icon: FileText, exact: false},
    {path: '/roadmap', label: 'Roadmap', icon: CalendarClock, exact: false},
    {path: '/reviews', label: 'Reviews', icon: ClipboardCheck, exact: false},
    {path: '/stats', label: 'Statistics', icon: ChartLine, exact: false},
    {path: '/notifications', label: 'Notifications', icon: Bell, exact: false},
    {path: '/newsletter', label: 'Newsletter', icon: Mail, exact: false},
    {path: '/activity', label: 'Activity log', icon: History, exact: false},
  ];
  /** Team & roles and the content check only show up for owners */
  protected readonly navItems = computed(() => this.currentUser.isOwner()
    ? [...this.nav, {path: '/content-check', label: 'Content check', icon: ShieldCheck, exact: false},
      {path: '/team', label: 'Team & roles', icon: Users, exact: false}]
    : this.nav);
  /** owners see what waits for them, everyone else their changes that were sent back */
  protected readonly reviewCount = computed(() => {
    const counts = this.reviews.counts();
    if (!counts) return 0;
    return this.currentUser.isOwner() ? counts.pending : counts.changesRequested;
  });
  protected readonly icons = {
    ArrowUpRight, Bell, ChartLine, ChevronDown, ChevronLeft, ChevronsUpDown, Eye, History, Layers, LayoutDashboard,
    LogOut, Menu, Monitor, Moon, Store, Sun, UserRound, Users
  };
  protected readonly checklistDone = checklistDone;

  /** e.g. Apps / Activity Pulse / Releases; the last one is the current page. */
  protected readonly crumbs = computed(() => {
    const appName = this.context.app()?.name ?? '…';
    const crumbs = this.steps().map(step => ({url: step.url, label: step.isApp ? appName : step.label!}));
    return crumbs.length === 1 ? [{url: '/', label: 'Console'}, ...crumbs] : crumbs;
  });

  constructor() {
    this.currentUser.ensure().subscribe();
    this.reviews.refreshCounts();

    this.updateSteps();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => {
      this.updateSteps();
      this.reviews.refreshCounts();
      this.navOpen.set(false);
    });
  }

  protected initial(user: User) {
    return (user.username ?? '?').charAt(0).toUpperCase();
  }

  protected openSwitcher() {
    if (!this.context.apps()) this.context.loadApps();
  }

  /** Ctrl+K (⌘K on a Mac) opens the command palette anywhere in the console, and closes it again. */
  protected shortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette.toggle();
    }
  }

  protected logout() {
    this.currentUser.signOut();
  }

  /** Every route with a label (or the app route) adds one breadcrumb step. */
  private updateSteps() {
    const steps: RouteStep[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let url = '';
    while (route) {
      const path = route.url.map(segment => segment.path).join('/');
      if (path) url += '/' + path;
      const data = route.routeConfig?.data;
      if (data?.['label'] || data?.['isApp']) {
        steps.push({url: url || '/', label: data['label'], isApp: data['isApp']});
      }
      route = route.firstChild;
    }
    this.steps.set(steps);
  }
}
