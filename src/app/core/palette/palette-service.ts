import {inject, Injectable} from '@angular/core';
import {Dialog, DialogRef} from '@angular/cdk/dialog';
import {Overlay} from '@angular/cdk/overlay';
import {CommandPalette} from './command-palette';

/** Opens the command palette near the top of the window; one at a time. */
@Injectable({providedIn: 'root'})
export class PaletteService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private ref: DialogRef<unknown, CommandPalette> | null = null;

  toggle() {
    if (this.ref) this.ref.close();
    else this.open();
  }

  open() {
    if (this.ref) return;
    this.ref = this.dialog.open(CommandPalette, {
      ariaLabel: 'Command palette',
      backdropClass: 'confirm-backdrop',
      positionStrategy: this.overlay.position().global().centerHorizontally().top('min(12vh, 96px)'),
      autoFocus: 'input',
    });
    this.ref.closed.subscribe(() => this.ref = null);
  }
}
