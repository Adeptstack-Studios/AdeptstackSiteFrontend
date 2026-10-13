import {Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {LucideAngularModule, Plus, Search} from 'lucide-angular';
import {ConsoleService} from '../../../services/console-service';
import {AppSummary} from '../../../models/console';
import {AppsTable} from '../apps-table/apps-table';
import {EditOnly} from '../../../shared/ui/edit-only';

/** All apps, with search and the way to create one. */
@Component({
  selector: 'app-app-list',
  imports: [RouterLink, LucideAngularModule, AppsTable, EditOnly],
  templateUrl: './app-list.html',
  styles: `
    .search {
      position: relative;
      width: 240px;
    }

    .search lucide-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
    }

    .search .c-input {
      padding-left: 34px;
    }

    .skeleton-row {
      height: 54px;
      margin: 10px 20px;
    }
  `
})
export class AppList {
  private readonly console = inject(ConsoleService);

  protected readonly icons = {Plus, Search};
  protected readonly apps = signal<AppSummary[] | null>(null);
  protected readonly search = signal('');

  protected readonly shown = computed(() => {
    const term = this.search().trim().toLowerCase();
    const apps = this.apps() ?? [];
    if (!term) return apps;
    return apps.filter(app => [app.name, app.slug, app.category, app.platforms]
      .some(value => value?.toLowerCase().includes(term)));
  });

  constructor() {
    this.console.apps().subscribe(apps => this.apps.set(apps));
  }
}
