import {Component, inject} from '@angular/core';
import {LucideAngularModule, Search} from 'lucide-angular';
import {PaletteService} from './palette-service';

/** The search field look-alike in the top bar: opens the command palette, and shows its shortcut. */
@Component({
  selector: 'app-palette-trigger',
  imports: [LucideAngularModule],
  template: `
    <button type="button" class="trigger" (click)="palette.open()" aria-haspopup="dialog"
            [attr.aria-keyshortcuts]="mac ? 'Meta+K' : 'Control+K'" aria-label="Search and jump to">
      <lucide-icon [img]="searchIcon" [size]="16" aria-hidden="true"></lucide-icon>
      <span class="text">Search…</span>
      <kbd aria-hidden="true">{{ mac ? '⌘' : 'Ctrl' }} K</kbd>
    </button>
  `,
  styles: `
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 220px;
      height: 36px;
      padding: 0 8px 0 12px;
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel-2);
      color: var(--muted);
      font: inherit;
      font-size: 13.5px;
      cursor: pointer;
      transition: border-color .15s;
    }

    .trigger:hover {
      border-color: var(--line-strong);
    }

    .text {
      flex: 1;
      text-align: left;
    }

    kbd {
      padding: 1px 6px;
      border: 1px solid var(--line);
      border-radius: 5px;
      background: var(--panel);
      font-family: var(--font-mono);
      font-size: 11px;
    }

    @media (max-width: 900px) {
      .trigger {
        width: 36px;
        padding: 0;
        justify-content: center;
      }

      .text,
      kbd {
        display: none;
      }
    }
  `
})
export class PaletteTrigger {
  protected readonly palette = inject(PaletteService);
  protected readonly searchIcon = Search;
  protected readonly mac = /Mac|iPhone|iPad/.test(navigator.platform);
}
