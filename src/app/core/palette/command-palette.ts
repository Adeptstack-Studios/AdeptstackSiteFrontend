import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {DialogRef} from '@angular/cdk/dialog';
import {catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap} from 'rxjs';
import {LucideAngularModule, Search} from 'lucide-angular';
import {AppContext} from '../app-context/app-context';
import {CurrentUser} from '../auth/current-user';
import {ThemeService} from '../theme/theme-service';
import {ConsoleService} from '../../services/console-service';
import {AppTile} from '../../shared/ui/app-tile';
import {Command, fromHit, Group, GROUPS, ICONS, readRecent, remember, score, words} from './commands';

/** shown per group while something is typed */
const PER_GROUP = 6;
/** apps on the empty palette; the rest are a few letters away */
const EMPTY_APPS = 8;

interface Section {
  group: Group;
  items: { command: Command; index: number }[];
}

/**
 * Ctrl+K: jump to any page, app, release, post or review, or run an action, by typing a few letters.
 * Pages, apps and actions are known here; releases, posts and open reviews come from the backend's search.
 */
@Component({
  selector: 'app-command-palette',
  imports: [LucideAngularModule, AppTile],
  template: `
    <div class="palette">
      <div class="search">
        <lucide-icon [img]="searchIcon" [size]="18" aria-hidden="true"></lucide-icon>
        <input #input type="text" class="query" placeholder="Search apps, releases, posts, pages or actions…"
               role="combobox" aria-label="Search the console" aria-autocomplete="list" aria-expanded="true"
               aria-controls="palette-list" [attr.aria-activedescendant]="flat().length ? 'palette-option-' + active() : null"
               autocomplete="off" spellcheck="false" [value]="query()" (input)="type($event)" (keydown)="key($event)">
        <kbd class="esc">Esc</kbd>
      </div>

      <div class="list" id="palette-list" role="listbox" aria-label="Results" #list>
        @for (section of sections(); track section.group) {
          <div role="group" [attr.aria-labelledby]="'palette-group-' + $index">
            <div class="group" [id]="'palette-group-' + $index">{{ section.group }}</div>
            @for (item of section.items; track item.command.id) {
              <div class="option" role="option" [id]="'palette-option-' + item.index"
                   [attr.aria-selected]="item.index === active()" [class.active]="item.index === active()"
                   (mousemove)="active.set(item.index)" (click)="choose(item.command, $event)">
                @if (item.command.app && item.command.group !== 'Posts') {
                  <app-tile [name]="item.command.app.name" [iconUrl]="item.command.app.iconUrl" [size]="24"></app-tile>
                } @else {
                  <span class="icon" aria-hidden="true">
                    <lucide-icon [img]="icons[item.command.icon]" [size]="15"></lucide-icon>
                  </span>
                }
                <span class="text">
                  <span class="label">{{ item.command.label }}</span>
                  @if (item.command.detail) {
                    <span class="detail">{{ item.command.detail }}</span>
                  }
                </span>
                @if (item.command.chip; as chip) {
                  <span class="chip" [attr.data-tone]="chip.tone">{{ chip.label }}</span>
                }
                @if (item.command.url?.startsWith('http')) {
                  <lucide-icon class="external" [img]="icons.ArrowUpRight" [size]="14" aria-label="opens in a new tab"></lucide-icon>
                }
              </div>
            }
          </div>
        }

        @if (searching()) {
          <p class="note">Searching releases, posts and reviews…</p>
        } @else if (searchFailed()) {
          <p class="note">Releases, posts and reviews can't be searched right now.</p>
        } @else if (!flat().length) {
          <p class="note">Nothing found for “{{ query().trim() }}”.</p>
        }
      </div>

      <div class="foot" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>{{ newTabKey }}</kbd>+<kbd>Enter</kbd> new tab</span>
      </div>
      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
    </div>
  `,
  styleUrl: './command-palette.css',
})
export class CommandPalette {
  private readonly ref = inject(DialogRef);
  private readonly router = inject(Router);
  private readonly context = inject(AppContext);
  private readonly currentUser = inject(CurrentUser);
  private readonly theme = inject(ThemeService);
  private readonly console = inject(ConsoleService);

  protected readonly searchIcon = Search;
  protected readonly icons = ICONS;
  protected readonly newTabKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  protected readonly query = signal('');
  protected readonly active = signal(0);
  private readonly recent = readRecent();

  /** the backend's hits for the query, null while nothing is to be searched, 'loading' or 'failed' in between */
  private readonly remote = toSignal(toObservable(this.query).pipe(
    map(query => query.trim()),
    debounceTime(150),
    distinctUntilChanged(),
    switchMap(query => query.length < 2 ? of(null) : this.console.search(query).pipe(
      map(hits => hits.map(fromHit)),
      catchError(() => of('failed' as const)),
      startWith('loading' as const),
    )),
  ), {initialValue: null});

  protected readonly searching = computed(() => this.remote() === 'loading');
  protected readonly searchFailed = computed(() => this.remote() === 'failed');

  /** pages, the open app, all apps and actions, as far as the role allows */
  private readonly commands = computed<Command[]>(() => {
    const owner = this.currentUser.isOwner();
    const canEdit = this.currentUser.canEdit();
    const commands: Command[] = [];
    const page = (label: string, url: string, icon: Command['icon'], keywords?: string): Command =>
      ({id: 'page:' + url, group: 'Pages', label, url, icon, keywords});

    const app = this.context.app();
    const slug = this.context.slug();
    if (slug) {
      const name = app?.name ?? slug;
      const here = (label: string, path: string, icon: Command['icon'], keywords?: string): Command =>
        ({id: `app:${slug}${path}`, group: 'This app', label, detail: name, url: `/apps/${slug}${path}`, icon, keywords});
      commands.push(
        here('Dashboard', '', 'LayoutDashboard', 'overview'),
        here('Releases', '/releases', 'Layers', 'versions changelog'),
        here('Store listing', '/listing', 'Store', 'description screenshots icon'),
        here('Statistics', '/stats', 'ChartLine', 'downloads views'),
        here('Notifications', '/notifications', 'Bell', 'push'),
        here('Activity', '/activity', 'History', 'log'),
      );
      if (canEdit) commands.push({...here('New release', '/releases/new', 'Plus', 'create add version'), group: 'Actions'});
      commands.push({id: 'site:' + slug, group: 'This app', label: 'Open on the website', detail: '/products/' + slug,
        url: 'https://adeptstack.net/products/' + slug, icon: 'ArrowUpRight'});
    }

    commands.push(
      page('Overview', '/', 'House', 'home start'),
      page('All apps', '/apps', 'LayoutGrid', 'products'),
      page('Blog', '/blog', 'FileText', 'posts news'),
      page('Roadmap', '/roadmap', 'CalendarClock', 'planned upcoming coming soon timeline'),
      page('Reviews', '/reviews', 'ClipboardCheck', 'approve submissions'),
      page('Statistics', '/stats', 'ChartLine', 'views visitors downloads'),
      page('Notifications', '/notifications', 'Bell', 'push'),
      page('Newsletter', '/newsletter', 'Mail', 'subscribers email'),
      page('Activity log', '/activity', 'History', 'history changes'),
    );
    if (owner) {
      commands.push(page('Content check', '/content-check', 'ShieldCheck', 'words rules blocked'),
        page('Webhooks', '/webhooks', 'Webhook', 'discord integration notify announce'),
        page('Team & roles', '/team', 'Users', 'members invite owner editor viewer'));
    }
    commands.push(page('Account', '/account', 'UserRound', 'password profile'));

    for (const other of this.context.apps() ?? []) {
      const tile = {name: other.name, iconUrl: other.iconUrl};
      commands.push({id: 'app:' + other.slug, group: 'Apps', label: other.name, app: tile,
        detail: [other.category, other.visibility === 'PRIVATE' ? 'Draft' : null].filter(Boolean).join(' · ') || undefined,
        keywords: other.slug, url: '/apps/' + other.slug, icon: 'LayoutGrid'});
      // "ctu rel" finds the releases of CTU: offered only once something is typed
      for (const [label, path, icon] of [['Releases', '/releases', 'Layers'], ['Store listing', '/listing', 'Store'],
        ['Statistics', '/stats', 'ChartLine']] as const) {
        commands.push({id: `app:${other.slug}${path}`, group: 'Apps', label: `${other.name}: ${label}`, app: tile,
          keywords: other.slug, url: `/apps/${other.slug}${path}`, icon, searchOnly: true});
      }
      if (canEdit) {
        commands.push({id: `app:${other.slug}/releases/new`, group: 'Actions', label: `New release of ${other.name}`,
          keywords: other.slug + ' create add version', url: `/apps/${other.slug}/releases/new`, icon: 'Plus', searchOnly: true});
      }
    }

    if (canEdit) {
      commands.push(
        {id: 'action:new-post', group: 'Actions', label: 'New post', keywords: 'blog write create add', url: '/blog/new', icon: 'Plus'},
        {id: 'action:new-app', group: 'Actions', label: 'Create app', keywords: 'new add product', url: '/apps/new', icon: 'Plus'},
      );
    }
    if (owner) {
      commands.push({id: 'action:invite', group: 'Actions', label: 'Invite someone to the team', keywords: 'member add user',
        url: '/team', icon: 'Users', searchOnly: true});
    }
    commands.push(
      this.theme.isDark()
        ? {id: 'action:light', group: 'Actions', label: 'Switch to light mode', keywords: 'theme', icon: 'Sun', run: () => this.theme.setMode('light')}
        : {id: 'action:dark', group: 'Actions', label: 'Switch to dark mode', keywords: 'theme', icon: 'Moon', run: () => this.theme.setMode('dark')},
      {id: 'action:system', group: 'Actions', label: 'Use the system theme', keywords: 'light dark mode', icon: 'Monitor',
        run: () => this.theme.setMode('system'), searchOnly: true},
      {id: 'action:logout', group: 'Actions', label: 'Log out', keywords: 'sign out', icon: 'LogOut',
        run: () => this.currentUser.signOut(), searchOnly: true},
    );
    return commands;
  });

  protected readonly sections = computed<Section[]>(() => {
    const typed = words(this.query());
    let chosen: Command[];
    if (!typed.length) {
      const recent: Command[] = this.recent.map(entry => ({...entry, group: 'Recent'}));
      const seen = new Set(recent.map(command => command.id));
      chosen = [...recent, ...this.commands().filter(command => !command.searchOnly && !seen.has(command.id))];
    } else {
      const remote = this.remote();
      const hits = Array.isArray(remote) ? remote : [];
      chosen = this.commands()
        .map(command => ({command, points: score(command, typed)}))
        .filter(entry => entry.points > 0)
        .sort((a, b) => b.points - a.points)
        .map(entry => entry.command)
        .concat(hits);
    }

    let index = 0;
    return GROUPS.map(group => {
      const limit = typed.length ? PER_GROUP : group === 'Apps' ? EMPTY_APPS : Infinity;
      const items = chosen.filter(command => command.group === group).slice(0, limit)
        .map(command => ({command, index: 0}));
      return {group, items};
    }).filter(section => section.items.length)
      .map(section => ({...section, items: section.items.map(item => ({...item, index: index++}))}));
  });

  protected readonly flat = computed(() => this.sections().flatMap(section => section.items.map(item => item.command)));

  protected readonly announcement = computed(() => {
    if (!this.query().trim()) return '';
    const count = this.flat().length;
    return count ? `${count} ${count === 1 ? 'result' : 'results'}` : 'No results';
  });

  constructor() {
    if (!this.context.apps()) this.context.loadApps();
    // a new query starts at the best match
    effect(() => {
      this.query();
      this.active.set(0);
    });
    effect(() => {
      const index = this.active();
      this.list().nativeElement.querySelector(`#palette-option-${index}`)?.scrollIntoView({block: 'nearest'});
    });
  }

  protected type(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected key(event: KeyboardEvent) {
    const count = this.flat().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (count) this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.set((this.active() - 1 + count) % count);
        break;
      case 'Home':
      case 'End':
        // with text typed, Home and End stay in the field
        if (this.query()) return;
        event.preventDefault();
        if (count) this.active.set(event.key === 'Home' ? 0 : count - 1);
        break;
      case 'Enter': {
        event.preventDefault();
        const command = this.flat()[this.active()];
        if (command) this.choose(command, event);
        break;
      }
    }
  }

  /** Runs the action or opens the address; with Ctrl or ⌘ held, a console page opens in a new tab. */
  protected choose(command: Command, event: MouseEvent | KeyboardEvent) {
    remember(command);
    if (command.run) {
      this.ref.close();
      command.run();
      return;
    }
    const url = command.url!;
    const external = url.startsWith('http');
    if (external || event.ctrlKey || event.metaKey) {
      window.open(external ? url : location.origin + url, '_blank', 'noopener');
      if (external) this.ref.close();
      else this.input().nativeElement.focus();
      return;
    }
    this.ref.close();
    this.router.navigateByUrl(url);
  }
}
