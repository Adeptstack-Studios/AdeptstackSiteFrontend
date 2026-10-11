import {Component, inject} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {LucideAngularModule, TriangleAlert} from 'lucide-angular';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** What the confirm button does, e.g. "Delete post". */
  confirmLabel: string;
  /** Red button for things that cannot be undone. */
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [LucideAngularModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  protected readonly options = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly warnIcon = TriangleAlert;
}
