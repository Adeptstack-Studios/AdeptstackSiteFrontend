import {inject, Injectable} from '@angular/core';
import {Dialog} from '@angular/cdk/dialog';
import {firstValueFrom} from 'rxjs';
import {ConfirmDialog, ConfirmOptions} from './confirm-dialog';

/** Asks before something irreversible happens: `if (await confirm.ask({...})) { ... }` */
@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  async ask(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean, ConfirmOptions>(ConfirmDialog, {
      data: options,
      backdropClass: 'confirm-backdrop',
      // Esc and a click on the backdrop count as "Cancel"
      disableClose: false,
    });
    const result = await firstValueFrom(ref.closed);
    return result === true;
  }
}
